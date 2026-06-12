from flask import Flask, render_template, request, jsonify
import pandas as pd
import os

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

progress = {
    "percent": 0,
    "status": "Waiting..."
}


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

    file = request.files["file"]

    filepath = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    file.save(filepath)

    # --------------------------------------------------
    progress["percent"] = 10
    progress["status"] = "Reading file..."

    if file.filename.endswith(".csv"):
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)

    # --------------------------------------------------
    progress["percent"] = 20
    progress["status"] = "Finding date column..."

    # Column C (3rd column) contains date/time
    date_col = df.columns[2]

    # --------------------------------------------------
    progress["percent"] = 30
    progress["status"] = "Selecting columns..."

    df = df[
        [
            "Short name",
            date_col,
            "Memory_Used_Percentage_Prometheus_Max_H_Cloud"
        ]
    ]

    total_rows = len(df)

    # --------------------------------------------------
    progress["percent"] = 40
    progress["status"] = "Filtering CEP records..."

    df = df[
        df["Short name"]
        .str.contains("CEP", na=False)
    ]

    cep_rows = len(df)

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
        df[
            "Memory_Used_Percentage_Prometheus_Max_H_Cloud"
        ],
        errors="coerce"
    )

    df = df[
        df["Memory"] >= 70
    ]

    threshold_rows = len(df)

    # --------------------------------------------------
    progress["percent"] = 70
    progress["status"] = "Extracting Site and Node..."

    def extract_site(text):

        text = str(text)

        if "_" not in text:
            return ""

        return text.split("_", 1)[0]

    def extract_hypervisor(text):

        text = str(text)

        if "_" not in text:
            return ""

        return text.split("_", 1)[1]

    df["Site"] = df["Short name"].apply(
        extract_site
    )

    df["Hypervisor"] = df["Short name"].apply(
        extract_hypervisor
    )

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

    # Remove time, keep only date
    final_df["Date"] = (
        pd.to_datetime(
            final_df["Date"],
            errors="coerce"
        )
        .dt.strftime("%d/%m/%y")
    )

    # Round memory values
    final_df["Memory"] = (
        final_df["Memory"]
        .round(2)
    )

    table_data = final_df[
        [
            "Site",
            "Hypervisor",
            "Date",
            "Memory_Used_Percentage_Prometheus_Max_H_Cloud"
        ]
    ].to_dict(
        orient="records"
    )

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