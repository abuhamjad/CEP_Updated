from flask import Flask, render_template, request, jsonify
import pandas as pd
from cryptography.fernet import Fernet
import json
import os
import plotly.express as px

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

REPORT_FOLDER = "reports"

os.makedirs(
    REPORT_FOLDER,
    exist_ok=True
)

progress = {
    "percent": 0,
    "status": "Waiting..."
}

latest_report_file = None
latest_processed_df = None
latest_chart_df = None

EXCLUDED_PATTERNS = (
    "INSTALLER|DASHBOARD|HWRK|OPENSHIFT"
)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/progress")
def get_progress():
    return jsonify(progress)


@app.route("/process", methods=["POST"])
def process_file():

    global progress

    progress["percent"] = 0
    progress["status"] = "Starting..."

    files = request.files.getlist("files")

    if not files:
        return jsonify({
            "error": "No files uploaded"
        }), 400

    progress["percent"] = 10
    progress["status"] = "Reading files..."

    processed_dfs = []

    for file in files:

        filepath = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )

        file.save(filepath)

        try:

            if file.filename.lower().endswith(".csv"):

                df = pd.read_csv(
                    filepath
                )

            else:

                df = pd.read_excel(
                    filepath
                )

        except Exception as e:

            print(
                f"Skipping {file.filename}: {e}"
            )

            continue

        # --------------------------------------------------
        progress["percent"] = 20
        progress["status"] = "Finding date column..."
        

        date_col = None

        for col in df.columns:

            sample = (
                df[col]
                .dropna()
                .head(20)
            )

            if len(sample) == 0:
                continue

            converted = pd.to_datetime(
                sample,
                errors="coerce"
            )

            if converted.notna().sum() >= len(sample) * 0.8:
                date_col = col
                break

        if date_col is None:

            return jsonify({
                "error": "Date column not found"
            }), 400

        # --------------------------------------------------
        progress["percent"] = 30
        progress["status"] = "Selecting columns..."

        memory_col = next(
            (
                col
                for col in df.columns
                if "memory_used_percentage" in str(col).lower()
                and "max" in str(col).lower()
            ),
            None
        )

        if memory_col is None:
            return jsonify({
                "error": "Memory column not found"
            }), 400

        df = df[
            [
                "Short name",
                date_col,
                memory_col
            ]
        ]

        total_rows = len(df)

        # --------------------------------------------------
        progress["percent"] = 40
        progress["status"] = "Filtering CEP records..."

        df = df[
            (
                df["Short name"]
                .str.contains(
                    "CEP",
                    case=False,
                    na=False
                )
            )
            &
            (
                ~df["Short name"]
                .str.contains(
                    EXCLUDED_PATTERNS,
                    case=False,
                    na=False
                )
            )
        ]

        cep_rows = len(df)
        #debugging
        print("\nRemaining rows after CEP filter:")
        print(df["Short name"].head(20).to_list())

        # --------------------------------------------------
        progress["percent"] = 50
        progress["status"] = "Removing INSTALLER/DASHBOARD..."
        

        df = df[
            ~df["Short name"].str.contains(
                "INSTALLER|DASHBOARD",
                case=False,
                na=False
            )
        ]

        # --------------------------------------------------
        progress["percent"] = 60
        progress["status"] = "Applying threshold..."
        

        df["Memory"] = pd.to_numeric(
            df[memory_col],
            errors="coerce"
        )

        df = df[
            df["Memory"] >= 70
        ]

        threshold_rows = len(df)

        if df.empty:

            print(
                f"{file.filename} skipped - no rows above threshold"
            )

            continue

        print("Rows after CEP filter:", len(df))
        print(df.head())
        # --------------------------------------------------
        progress["percent"] = 70
        progress["status"] = "Extracting Site and Node..."
        
        if df.empty:
            return jsonify({
                "error": "No CEP records found after filtering."
            }), 400

        split_cols = (
            df["Short name"]
            .astype(str)
            .str.split(
                "_",
                n=1,
                expand=True
            )
        )

        df["Site"] = split_cols.iloc[:, 0]

        if split_cols.shape[1] > 1:
            df["Hypervisor"] = split_cols.iloc[:, 1]
        else:
            df["Hypervisor"] = "UNKNOWN"

        # --------------------------------------------------
        progress["percent"] = 80
        progress["status"] = "Finding highest memory per node..."
        

        idx = (
            df.groupby(
                ["Site", "Hypervisor"]
            )["Memory"]
            .idxmax()
        )

        final_df = df.loc[idx]

        processed_dfs.append(
            final_df
        )

    if not processed_dfs:

        return jsonify({
            "error":
            "No qualifying CEP records found."
        }), 400

    final_df = pd.concat(
        processed_dfs,
        ignore_index=True
    )

    # --------------------------------------------------
    progress["percent"] = 90
    progress["status"] = "Sorting..."
    

    final_df = final_df.sort_values(
        "Memory",
        ascending=False
    )

    final_count = len(final_df)

    # --------------------------------------------------
    progress["percent"] = 95
    progress["status"] = "Building chart..."
    

    def extract_state(site):

        parts = str(site).split(".")

        return parts[-1]

    final_df["State"] = final_df["Site"].apply(
        extract_state
    )

    chart_df = (
        final_df.groupby("State")
        .size()
        .reset_index(name="Node Count")
        .sort_values(
            "Node Count",
            ascending=False
        )
    )

    chart_data = chart_df.to_dict(
        orient="records"
    )

    # --------------------------------------------------
    progress["percent"] = 100
    progress["status"] = "Completed"

    final_df = final_df.rename(
        columns={
            date_col: "Date"
        }
    )

    final_df["Date"] = (
        pd.to_datetime(
            final_df["Date"],
            errors="coerce"
        )
        .dt.strftime("%d-%b-%Y")
    )

    # Round memory values
    final_df["Memory"] = (
        final_df["Memory"]
        .round(2)
    )

    table_data = (
        final_df[
            [
                "Site",
                "Hypervisor",
                "Date",
                memory_col
            ]
        ]
        .to_dict(
            orient="records"
        )
    )

    report_path = os.path.join(
        REPORT_FOLDER,
        "CEP_Memory_Report.xlsx"
    )

    export_df = final_df[
        [
            "Site",
            "Hypervisor",
            "Date",
            memory_col
        ]
    ]

    export_df.to_excel(
            report_path,
            index=False
        )
    
    global latest_report_file
    global latest_processed_df
    global latest_chart_df

    latest_report_file = report_path

    latest_processed_df = export_df.copy()

    latest_chart_df = chart_df.copy()

    return jsonify({
        "summary": {
            "total_rows": total_rows,
            "cep_rows": cep_rows,
            "threshold_rows": threshold_rows,
            "final_nodes": final_count
        },
        "table": table_data,
        "chart": chart_data
    })

if __name__ == "__main__":
    app.run(debug=True)