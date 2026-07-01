let visualProgress = 0;
let progressTimer = null;
let taskTimer = null;

let tableData = [];
let chartData = [];
let chart;

const TASKS = [
    "Importing Data",
    "Processing Records",
    "Generating Report",
    "Finalizing"
];

let isDark=false, isProcessing=false, collapsed=false, confirmTimer=null;
let taskStatuses = TASKS.map(()=>'pending');

function toggleTheme(){
  isDark=!isDark;
  document.documentElement.classList.toggle('dark',isDark);
  document.getElementById('icon-moon').classList.toggle('hidden',isDark);
  document.getElementById('icon-sun').classList.toggle('hidden',!isDark);
  if(
    !document
    .getElementById('report-capture')
    .classList.contains('hidden')
    &&
    chartData.length
  )
  console.log(result);
  {
    buildChart(chartData);
  }
}

function onFileChange(el){

    const files = el.files;

    if(files.length === 0){

        document.getElementById(
            'file-name'
        ).textContent =
            'No file selected';

        document
            .getElementById(
                "threshold-container"
            )
            .classList.add(
                "hidden"
            );

        document
            .getElementById(
                'action-row'
            )
            .classList.add(
                'hidden'
            );

        return;
    }

    document.getElementById(
        'file-name'
    ).textContent =
        `${files.length} file(s) selected`;

    document
        .getElementById(
            'file-label'
        )
        .classList.remove(
            'hidden'
        );

    document
        .getElementById(
            'action-row'
        )
        .classList.remove(
            'hidden'
        );

    document
        .getElementById(
            "threshold-container"
        )
        .classList.remove(
            "hidden"
        );

    document
        .getElementById(
            'export-row'
        )
        .classList.add(
            'hidden'
        );

    document
        .getElementById(
            'report-capture'
        )
        .classList.add(
            'hidden'
        );

    closeTaskPopup();

    taskStatuses =
        TASKS.map(
            () => 'pending'
        );

    isProcessing = false;

    setStartBtn();
}

function getStatusFromProgress(pct){

    if(pct < 20)
        return "Reading file...";

    if(pct < 45)
        return "Filtering records...";

    if(pct < 75)
        return "Analyzing memory usage...";

    if(pct < 95)
        return "Generating report...";

    return "Finalizing...";
}

function startTaskAnimation() {

    const stages = [
    { task: 0, delay: 4000 },
    { task: 1, delay: 8000 },
    { task: 2, delay: 12000 },
    { task: 3, delay: 15000 }
    ];

    let current = 0;

    function nextStage() {

        if (!isProcessing) return;

        taskStatuses.forEach((_, i) => {

            if (i < current) {
                taskStatuses[i] = "completed";
            }
            else if (i === current) {
                taskStatuses[i] = "processing";
            }
            else {
                taskStatuses[i] = "pending";
            }

        });

        renderTasks();
        updatePopupHeader();

        if (current >= stages.length - 1) {
            return;
        }

        taskTimer = setTimeout(() => {

            current++;

            nextStage();

        }, stages[current].delay);

    }

    nextStage();
}

function startFakeProgress() {

    visualProgress = 0;

    progressTimer = setInterval(() => {

        if (!isProcessing) {
            clearInterval(progressTimer);
            return;
        }

        if (visualProgress < 95) {

            let increment;

            if (visualProgress < 30) {
                increment = 4;
            }
            else if (visualProgress < 60) {
                increment = 2;
            }
            else if (visualProgress < 85) {
                increment = 1;
            }
            else {
                increment = 0.3;
            }

            visualProgress += increment;

            if (visualProgress > 95) {
                visualProgress = 95;
            }

            setPct(
                Math.round(visualProgress)
            );

            document.getElementById(
                "popup-label"
            ).textContent =
                getStatusFromProgress(
                    visualProgress
                );

        }

    }, 1000);

}

async function startProcessing(){

    const fileInput =
        document.getElementById(
            'file-input'
        );

    const files =
        fileInput.files;

    if(files.length === 0){
        alert(
            'Please select at least one file'
        );
        return;
    }

    if(isProcessing) return;

    const formData =
        new FormData();

    const threshold = document.getElementById(
        "threshold-input"
    ).value;

    formData.append(
        "threshold",
        threshold
    );

    for(let file of files){

        formData.append(
            'files',
            file
        );
    }

    isProcessing = true;

    setStartBtn();

    showTaskPopup();

    startFakeProgress();

    startTaskAnimation();

    try{

        const response =
            await fetch(
                '/process',
                {
                    method:'POST',
                    body:formData
                }
            );

        const text = await response.text();

        console.log(text);

        const data = JSON.parse(text);

        if(data.error){
            throw new Error(
                data.error
            );
        }

        document.getElementById(
            "chart-description"
        ).textContent =
            `Number of hypervisors exceeding ${threshold}% memory utilization`;

        tableData =
            data.table;

        chartData =
            data.chart;

        tableData =
            data.table;

        chartData =
            data.chart;

        showReport(
            tableData
        );

        buildChart(
            chartData
        );

        clearInterval(
            progressTimer
        );

        clearTimeout(
            taskTimer
        );

        visualProgress = 100;

        taskStatuses =
            TASKS.map(
                ()=> 'completed'
            );

        renderTasks();

        document.getElementById(
            "popup-label"
        ).textContent =
            "Completed";

        setPct(100);

        setTimeout(() => {

            closeTaskPopup();

        },3000);

    }

    catch(err){

        console.error(err);

        alert(
            err.message ||
            'Processing Failed'
        );
    }

    isProcessing = false;

    setStartBtn();
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function setPct(p){
  document.getElementById('progress-fill').style.width=p+'%';
  document.getElementById('popup-pct').textContent=p+'%';
}

function setStartBtn(){
  const b=document.getElementById('start-btn');
  b.disabled=isProcessing;
  b.innerHTML=isProcessing
    ?`<svg class="spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg> Processing…`
    :`<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="15" height="15"><path d="M8 5v14l11-7z"/></svg> Start Processing`;
}

function showTaskPopup(){ document.getElementById('task-popup').style.display='block'; collapsed=false; updateCollapse(); }
function closeTaskPopup(){ document.getElementById('task-popup').style.display='none'; }
function toggleCollapse(){ collapsed=!collapsed; document.getElementById('task-list').style.display=collapsed?'none':'flex'; updateCollapse(); }
function updateCollapse(){
  document.getElementById('collapse-btn').innerHTML=collapsed
    ?`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5"/></svg>`
    :`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>`;
}
function updatePopupHeader(){
  const done=taskStatuses.every(s=>s==='completed');
  const ai=taskStatuses.indexOf('processing');
  document.getElementById('popup-label').textContent=done?'Processing complete':ai>=0?TASKS[ai]:'Waiting…';
  document.getElementById('popup-spinner-wrap').innerHTML=done
    ?`<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#22c55e"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>`
    :`<svg class="spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#60a5fa"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>`;
}

function renderTasks(){
  const svgDone=`<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#22c55e"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>`;
  const svgProc=`<svg class="spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#60a5fa"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>`;
  const svgPend=`<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><circle cx="12" cy="12" r="9"/></svg>`;
  document.getElementById('task-list').innerHTML=TASKS.map((n,i)=>{
    const s=taskStatuses[i];
    const cls=s==='processing'?'task-processing':s==='completed'?'task-completed':'task-pending';
    const ico=s==='completed'?svgDone:s==='processing'?svgProc:svgPend;
    return `<div class="task-item ${cls}">${ico}<span>${n}</span></div>`;
  }).join('');
}

function getMemoryStyle(index,totalRows){

    const ratio =
        index /
        Math.max(
            totalRows - 1,
            1
        );

    const start = {
        r:179,
        g:33,
        b:52
    };

    const middle = {
        r:247,
        g:127,
        b:190
    };

    const end = {
        r:255,
        g:255,
        b:255
    };

    let r,g,b;

    if(ratio <= 0.5){

        const t =
            ratio * 2;

        r = Math.round(
            start.r +
            (
                middle.r -
                start.r
            ) * t
        );

        g = Math.round(
            start.g +
            (
                middle.g -
                start.g
            ) * t
        );

        b = Math.round(
            start.b +
            (
                middle.b -
                start.b
            ) * t
        );

    }
    else{

        const t =
            (ratio - 0.5) * 2;

        r = Math.round(
            middle.r +
            (
                end.r -
                middle.r
            ) * t
        );

        g = Math.round(
            middle.g +
            (
                end.g -
                middle.g
            ) * t
        );

        b = Math.round(
            middle.b +
            (
                end.b -
                middle.b
            ) * t
        );

    }

    return {

        background:
            `rgb(${r},${g},${b})`,

        color:
            ratio < 0.35
            ? "#ffffff"
            : "#111111"
    };
}

function showReport(rows){

    if(!rows || rows.length === 0){
        return;
    }

    document.getElementById(
        "row-count"
    ).textContent =
        rows.length + " rows returned";

    let html = `
        <thead>
            <tr>
                <th>Site</th>
                <th>Hypervisor</th>
                <th>Date</th>
                <th>Memory_Used_Percentage_Prometheus_Max_H_Cloud</th>
            </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row,index)=>{

        const style =
            getMemoryStyle(
                index,
                rows.length
            );

        const memory =
    parseFloat(
        row["Memory_Used_Percentage_Prometheus_Max_H_Cloud"]
       );

        html += `
        <tr>

            <td>${row.Site ?? ""}</td>

            <td>${row.Hypervisor ?? ""}</td>

            <td>${row.Date ?? ""}</td>

            <td
                style="
                    background:${style.background};
                    color:${style.color};
                    font-weight:600;
                    text-align:left;
                    padding-left:14px;
                "
            >
                ${memory.toFixed(2)}
            </td>

        </tr>
        `;

    });

    html += `
        </tbody>
    `;

    document.getElementById(
        "data-table"
    ).innerHTML = html;

    document
        .getElementById(
            "report-capture"
        )
        .classList.remove(
            "hidden"
        );

    document
        .getElementById(
            "export-row"
        )
        .classList.remove(
            "hidden"
        );
}

function buildChart(data){

    const ctx =
        document
        .getElementById(
            'chart-canvas'
        );

    if(chart){
        chart.destroy();
    }

    const canvasCtx =
        ctx.getContext(
            '2d'
        );

    const gradient =
        canvasCtx
        .createLinearGradient(
            0,
            0,
            0,
            400
        );

    gradient.addColorStop(
        0,
        '#1e3a8a'
    );

    gradient.addColorStop(
        1,
        '#93c5fd'
    );

    chart =
        new Chart(
            ctx,
            {
                type:'bar',

                data:{
                    labels:
                        data.map(
                            x => x.State
                        ),

                    datasets:[
                        {
                            label:
                            'Nodes Above 70%',

                            data:
                                data.map(
                                    x =>
                                    x["Node Count"]
                                ),

                            backgroundColor:
                                gradient,

                            borderRadius:8
                        }
                    ]
                },

                plugins:[
                    ChartDataLabels
                ],

                options:{

                    responsive:true,

                    plugins:{

                        legend:{
                            display:false
                        },

                        datalabels:{
                            color:'#ffffff',

                            anchor:'start',

                            align:'end',

                            offset: -5,

                            font:{
                                weight:'bold',
                                size:12
                            }
                        }
                    },

                    scales:{

                        x:{
                            grid:{
                                display:false
                            }
                        },

                        y:{
                            beginAtZero:true,

                            ticks:{
                                stepSize:1,
                                precision:0
                            },

                            grid:{
                                display:false
                            }
                        }
                    }
                }
            }
        );
}
window.addEventListener('resize',()=>{

    if(
        !document
        .getElementById('report-capture')
        .classList.contains('hidden')
        &&
        chartData.length
    ){
        buildChart(chartData);
    }

});

function resetAll(){
  document.getElementById('file-input').value='';
  document.getElementById('file-label').classList.add('hidden');
  document.getElementById('action-row').classList.add('hidden');
  document.getElementById('export-row').classList.add('hidden');
  document.getElementById('report-capture').classList.add('hidden');
  closeTaskPopup(); isProcessing=false; taskStatuses=TASKS.map(()=>'pending'); setStartBtn();
}

async function handlePDF() {

    const btn = document.getElementById('pdf-btn');

    btn.disabled = true;
    btn.innerHTML = 'Generating...';

    try {

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF(
            'landscape',
            'pt',
            'a4'
        );

        // Title
        pdf.setFontSize(20);
        pdf.text(
            'CEP Memory Report',
            40,
            40
        );

        pdf.setFontSize(10);

        pdf.text(
            `Generated: ${new Date().toLocaleString()}`,
            40,
            60
        );

        // Extract table data
        const rows = [];

        document
            .querySelectorAll('#data-table tbody tr')
            .forEach(tr => {

                const row = [];

                tr.querySelectorAll('td')
                  .forEach(td =>
                      row.push(td.innerText)
                  );

                rows.push(row);
            });

        // Generate table
        pdf.autoTable({

            startY: 80,

            head: [[
                'Site',
                'Hypervisor',
                'Date',
                'Memory Usage'
            ]],

            body: rows,

            theme: 'grid',

            styles: {
                fontSize: 8
            },

            headStyles: {
                fillColor: [37,99,235]
            },

            alternateRowStyles: {
                fillColor: [245,245,245]
            }

        });

        // Add chart on new page
        pdf.addPage();

        pdf.setFontSize(18);

        pdf.text(
            'Circle-wise Nodes Above Threshold',
            40,
            40
        );

        const chartCanvas =
            document.getElementById(
                'chart-canvas'
            );

        const chartImg =
            chartCanvas.toDataURL(
                'image/png'
            );

        pdf.addImage(
            chartImg,
            'PNG',
            40,
            70,
            700,
            350
        );

        pdf.save(
            'CEP_Memory_Report.pdf'
        );

    }
    catch(e) {

        alert(
            'PDF generation failed: '
            + e.message
        );
    }

    btn.disabled = false;

    btn.innerHTML =
        'Export as PDF';
}

function handleExcel(){

    if(!tableData.length){
        alert("No data available");
        return;
    }

    const wb =
        XLSX.utils.book_new();

    const ws =
        XLSX.utils.json_to_sheet(
            tableData
        );

    XLSX.utils.book_append_sheet(
        wb,
        ws,
        "CEP Report"
    );

    XLSX.writeFile(
        wb,
        "CEP-Memory-Report.xlsx"
    );
}