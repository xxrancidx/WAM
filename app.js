let userSub = '';

async function initializeLiff() {
    try {
        await liff.init({ liffId: "YOUR_LIFF_ID" });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            userSub = profile.userId;
            initializeCalendar();
        }
    } catch (err) {
        console.error('LIFF initialization failed', err);
    }
}

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        plugins: ['dayGrid'],
        dateClick: function(info) {
            fetchAttendanceData(info.dateStr);
        }
    });
    calendar.render();
}

async function fetchAttendanceData(date) {
    try {
        const response = await google.script.run.withSuccessHandler(displayResults)
                            .withFailureHandler(handleError)
                            .getAttendanceData(date, userSub);
    } catch (err) {
        handleError(err);
    }
}

function displayResults(data) {
    const resultContainer = document.getElementById('result');
    resultContainer.innerHTML = '';

    if (!data || (data.userRecords.length === 0 && data.otherRecords.length === 0)) {
        resultContainer.innerHTML = '<p>指定された日付のデータが見つかりませんでした</p>';
        return;
    }

    // ユーザー自身の記録を表示
    data.userRecords.forEach(record => {
        const recordElement = document.createElement('div');
        recordElement.className = 'result-item';
        recordElement.innerHTML = `
            識別子：${record.sub}<br>
            出向日：${record.date}<br>
            氏名：${record.name}<br>
            出向内容：${record.status}<br>
            現場名：${record.location}
            <button class="delete-btn" onclick="confirmDelete('${record.date}')">削除</button>
        `;
        resultContainer.appendChild(recordElement);
    });

    // 他のユーザーの記録を表示
    if (data.otherRecords.length > 0) {
        const summaryElement = document.createElement('div');
        summaryElement.className = 'summary-item';
        summaryElement.innerHTML = '<h3>他の出向報告：はい</h3>';
        
        data.otherRecords.forEach((record, index) => {
            summaryElement.innerHTML += `
                ${index + 1}. ${record.department}/${record.summary}/${record.location}<br>
            `;
        });
        resultContainer.appendChild(summaryElement);
    }
}

function confirmDelete(date) {
    if (confirm('この出向報告を削除しますか？')) {
        deleteAttendanceData(date);
    }
}

async function deleteAttendanceData(date) {
    try {
        await google.script.run.withSuccessHandler(() => {
            fetchAttendanceData(date); // 削除後にデータを再取得
        })
        .withFailureHandler(() => {
            alert('削除処理に失敗しました。時間をおいて再度お試しください');
        })
        .deleteAttendanceData(date, userSub);
    } catch (err) {
        handleError(err);
    }
}

function handleError(error) {
    console.error('Error:', error);
    alert('削除処理に失敗しました。時間をおいて再度お試しください');
}

window.onload = initializeLiff;
