registerBtn = document.getElementById("register");
registerBtn.addEventListener("click", () => {
    window.open("https://discord.com/invite/39KDYNcccD")
})

rickrollBtn = document.getElementById("rickroll");
rickrollBtn.addEventListener("click", () => {
    window.open("https://www.youtube.com/watch?v=xvFZjo5PgG0&list=RDxvFZjo5PgG0&start_radio=1")
})


const overlay = document.getElementById("overlay");
const learnMore = document.getElementById("learn-more");
const learnMoreBtn = document.getElementById("learn-more-btn");

learnMoreBtn.addEventListener("click", () => {
    learnMore.classList.toggle("hidden");
    overlay.classList.toggle("hidden");
});

overlay.addEventListener("click", () => {
    learnMore.classList.toggle("hidden");
    overlay.classList.toggle("hidden");
});


    fetch('https://raw.githubusercontent.com/nzlrattourney/rattourney/main/PreviousChamps.csv')
        .then(res => {
            if (!res.ok) throw new Error('File not found');
            return res.text();
        })
        .then(csvText => {
            const lines = csvText.trim().split('\n');

            const data = {};
            lines.forEach(line => {
                const cols = line.split(',');
                const season = cols[0].trim();
                const players = cols.slice(1).map(p => p.trim()).filter(p => p !== '');
                data[season] = players;
            });

            const maxPlayers = Math.max(...Object.values(data).map(arr => arr.length));

            const table = document.getElementById('champions-table');
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');

            thead.innerHTML = '';
            tbody.innerHTML = '';

            const headerRow = document.createElement('tr');
            Object.keys(data).forEach(season => {
                const th = document.createElement('th');
                th.textContent = season;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            for (let i = 0; i < maxPlayers; i++) {
                const tr = document.createElement('tr');
                Object.values(data).forEach(players => {
                    const td = document.createElement('td');
                    td.textContent = players[i] || '';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            }
        })
        .catch(console.error);


const modal = document.getElementById("scheduleModal");
const openBtn = document.getElementById("schedule-btn");


openBtn.addEventListener("click", function () {
    modal.style.display = "block";
});

document.addEventListener('click', function (event) {
    if (event.target.id === 'closeScheduleModal') {
        document.getElementById("scheduleModal").style.display = "none";
    }
});

window.addEventListener("click", function (event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});
const scheduleTable = document.getElementById("schedule-table-body");



const champsModal = document.getElementById("champsModal");
const openChampsBtn = document.getElementById("prev-champs-btn");


openChampsBtn.addEventListener("click", () => {
    champsModal.style.display = "block";
});

document.addEventListener('click', function (event) {
    if (event.target.id === 'closeChampsModal') {
        document.getElementById("champsModal").style.display = "none";
    }
});

window.addEventListener("click", (event) => {
    if (event.target === champsModal) {
        champsModal.style.display = "none";
    }
});


document.addEventListener('DOMContentLoaded', function() {
  const refreshBtn = document.getElementById('loadScheduleBtn');
  
  const scheduleTable = document.getElementById("schedule-table");
  scheduleTable.parentNode.insertBefore(refreshBtn, scheduleTable);
  
  loadSchedule();
  
  refreshBtn.addEventListener('click', loadSchedule);
});

function loadSchedule() {
  const scheduleTable = document.getElementById("schedule-table-body");
  const refreshBtn = document.getElementById('refreshBtn');
  
  scheduleTable.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  if (refreshBtn) refreshBtn.disabled = true;
  
  fetch('https://raw.githubusercontent.com/nzlrattourney/rattourney/main/Schedule.csv?t=' + Date.now())
    .then(response => {
      if (!response.ok) throw new Error('File not found');
      return response.text();
    })
    .then(data => {
      scheduleTable.innerHTML = '';
      
      const lines = data.trim().split('\n');
      const now = new Date();
      const nowNZ = new Date(now.toLocaleString("en-US", { 
        timeZone: "Pacific/Auckland" 
      }));
      
      lines.forEach(line => {
        const match = {};
        line.split(',').forEach(field => {
          const [key, value] = field.split(':').map(part => part.trim());
          match[key.toLowerCase()] = value;
        });
        
        const [day, month, year] = match.date.split('-').map(Number);
        const timeParts = match.time.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
        if (!timeParts) return;
        
        let hour = parseInt(timeParts[1]);
        const minute = timeParts[2] ? parseInt(timeParts[2]) : 0;
        const period = timeParts[3].toUpperCase();
        
        if (period === "PM" && hour < 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        
        const matchDate = new Date(year, month - 1, day, hour, minute);
        const matchEnd = new Date(matchDate);
        matchEnd.setHours(matchEnd.getHours() + 4);
        
        let status = "Upcoming";
        if (nowNZ >= matchDate && nowNZ <= matchEnd) status = "Live";
        else if (nowNZ > matchEnd) status = "Finished";
        
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${match.date}</td>
          <td>${match.time} NZST</td>
          <td>${match.team1}</td>
          <td>${match.team2}</td>
          <td class="status-${status.toLowerCase()}">${status}</td>
        `;
        scheduleTable.appendChild(row);
      });
    })
    .catch(error => {
      console.error("Error:", error);
      scheduleTable.innerHTML = '<tr><td colspan="5">Failed to load. Click Refresh to try again.</td></tr>';
    })
    .finally(() => {
      if (refreshBtn) refreshBtn.disabled = false;
    });
}