let days = [];
let currentDay = null;

const dayDateInput = document.getElementById("dayDate");
const newDayForm = document.getElementById("newDayForm");
const daySelector = document.getElementById("daySelector");
const currentDayContainer = document.getElementById("currentDayContainer");

function saveToStorage() {
  localStorage.setItem("trainingDays", JSON.stringify(days));
}

function loadFromStorage() {
  const raw = localStorage.getItem("trainingDays");
  if (raw) {
    days = JSON.parse(raw);
    if (days.length > 0) {
      currentDay = days[days.length - 1].date;
    }
  }
}

function renderDaySelector() {
  daySelector.innerHTML = "";
  days.forEach((day) => {
    const option = document.createElement("option");
    option.value = day.date;
    option.textContent = day.date;
    if (day.date === currentDay) option.selected = true;
    daySelector.appendChild(option);
  });
}

function renderCurrentDay() {
  const day = days.find((d) => d.date === currentDay);

  if (!day) {
    currentDayContainer.innerHTML = "<p>Brak danych na ten dzień.</p>";
    return;
  }

  currentDayContainer.innerHTML = `
        <h2>Trening z dnia: ${day.date}</h2>
        <form id="exerciseForm">
          <input list="exerciseList" type="text" id="exerciseName" placeholder="Nazwa ćwiczenia" required />
<datalist id="exerciseList"></datalist>
          <input type="number" id="reps" placeholder="Powtórzenia" min="1" required />
          <input type="number" id="weight" placeholder="Ciężar (kg)" min="0" step="0.5" required />
          <button type="submit">Dodaj serię</button>
        </form>
        <div id="exercisesList"></div>
      `;
  updateExerciseList();
  const form = document.getElementById("exerciseForm");
  const nameInput = document.getElementById("exerciseName");
  const repsInput = document.getElementById("reps");
  const weightInput = document.getElementById("weight");

  // Autouzupełnianie po wpisaniu ćwiczenia
  nameInput.addEventListener("change", () => {
    const name = nameInput.value.trim();
    const history = getLastSetForExercise(name);
    if (history) {
      repsInput.value = history.reps;
      weightInput.value = history.weight;
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    const reps = parseInt(repsInput.value);
    const weight = parseFloat(weightInput.value);
    if (!name) return;

    if (!day.exercises[name]) {
      day.exercises[name] = [];
    }
    const sets = day.exercises[name];
    const setNum = sets.length + 1;
    sets.push({ set: setNum, reps, weight });

    saveToStorage();
    renderCurrentDay();

    nameInput.value = "";
    repsInput.value = "";
    weightInput.value = "";
  });

  renderExercises(day);
}

function renderExercises(day) {
  const exListDiv = document.getElementById("exercisesList");
  exListDiv.innerHTML = "";

  for (const [name, sets] of Object.entries(day.exercises)) {
    const exDiv = document.createElement("div");
    exDiv.className = "exercise-card";

    let tableHtml = `
      <h3>${name}</h3>
      <table>
        <thead><tr><th>Seria</th><th>Powtórzenia</th><th>Kg</th></tr></thead>
        <tbody>
    `;

    sets.forEach((s) => {
      tableHtml += `<tr><td>${s.set}</td><td>${s.reps}</td><td>${s.weight}</td></tr>`;
    });

    tableHtml += `</tbody></table>`;

    tableHtml += `
      <form class="add-set-form" data-exercise="${name}" style="
        margin-top: 10px;
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: center;
      ">
        <input type="number" name="reps" placeholder="Powtórzenia" min="1" required style="width: 90px; text-align: center;" />
        <input type="number" name="weight" placeholder="Kg" min="0" step="0.5" required style="width: 90px; text-align: center;" />
        <button type="submit" style="
          background-color:#FF9800; color:#000; border:none; border-radius:5px; padding:6px 14px; cursor:pointer;
          font-weight: 600;
        ">Dodaj serię</button>
      </form>
    `;

    tableHtml += `<div class="chart-container"><canvas id="chart-${name}"></canvas></div>`;
    exDiv.innerHTML = tableHtml;
    exListDiv.appendChild(exDiv);
    // Po wstawieniu tabeli do DOM, znajdź tbody i ostatni wiersz
    const tbody = exDiv.querySelector("tbody");
    if (tbody) {
      const rows = tbody.querySelectorAll("tr");
      if (rows.length > 0) {
        rows[rows.length - 1].classList.add("fade-in-highlight");
      }
    }
  }

  generateCharts(day);

  document.querySelectorAll(".add-set-form").forEach((form) => {
    // Wypełnij pola autouzupełnieniem na podstawie ostatniej serii historycznej:
    const exerciseName = form.dataset.exercise;
    const lastSet = getLastSetForExercise(exerciseName);
    if (lastSet) {
      form.reps.value = lastSet.reps;
      form.weight.value = lastSet.weight;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const exerciseName = form.dataset.exercise;
      const reps = parseInt(form.reps.value);
      const weight = parseFloat(form.weight.value);
      if (!exerciseName || !reps || !weight) return;

      const day = days.find((d) => d.date === currentDay);
      if (!day) return;

      if (!day.exercises[exerciseName]) {
        day.exercises[exerciseName] = [];
      }
      const sets = day.exercises[exerciseName];
      const setNum = sets.length + 1;
      sets.push({ set: setNum, reps, weight });

      saveToStorage();
      renderCurrentDay();
    });
  });
}

function getLastSetForExercise(exerciseName) {
  const all = [...days].reverse();
  for (let day of all) {
    if (day.exercises[exerciseName] && day.exercises[exerciseName].length > 0) {
      return day.exercises[exerciseName].slice(-1)[0];
    }
  }
  return null;
}

function generateCharts(currentDayObj) {
  for (const name of Object.keys(currentDayObj.exercises)) {
    const canvas = document.getElementById(`chart-${name}`);
    if (!canvas) continue;

    const data = [];

    days.forEach((d) => {
      if (d.exercises[name]) {
        // Znajdź serię z maksymalnym ciężarem
        const maxSet = d.exercises[name].reduce(
          (max, set) => (set.weight > max.weight ? set : max),
          { weight: 0, reps: 0 }
        );
        data.push({
          date: d.date,
          weight: maxSet.weight,
          reps: maxSet.reps,
        });
      }
    });

    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: data.map((d) => d.date),
        datasets: [
          {
            label: `Postęp - ${name}`,
            data: data.map((d) => d.weight),
            borderColor: "rgba(0,255,179,1)",
            backgroundColor: "rgba(0,255,179,0.2)",
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "rgba(0,255,179,1)",
          },
        ],
      },
      options: {
        scales: {
          x: { ticks: { color: "#fff" }, grid: { color: "#333" } },
          y: { ticks: { color: "#fff" }, grid: { color: "#333" } },
        },
        plugins: {
          legend: { labels: { color: "#fff" } },
          tooltip: {
            callbacks: {
              label: function (context) {
                const idx = context.dataIndex;
                const reps = data[idx].reps;
                const weight = context.dataset.data[idx];
                return `${weight} kg (${reps} powt.)`;
              },
            },
          },
        },
      },
    });
  }
}
// Eksport danych do pliku JSON
document.getElementById("exportBtn").addEventListener("click", () => {
  const dataStr = JSON.stringify(days, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "training_backup.json";
  a.click();

  URL.revokeObjectURL(url);
});

// Import danych z pliku JSON
document.getElementById("importInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);

      // Walidacja minimalna — czy to tablica i czy jest sensowna struktura
      if (!Array.isArray(importedData))
        throw new Error("Niepoprawny format danych");

      // Nadpisujemy obecne dane
      days = importedData;
      if (days.length > 0) currentDay = days[days.length - 1].date;
      else currentDay = null;

      saveToStorage();
      renderDaySelector();
      renderCurrentDay();

      alert("Dane zostały zaimportowane poprawnie!");
    } catch (err) {
      alert("Błąd przy imporcie danych: " + err.message);
    }
  };
  reader.readAsText(file);

  // Czyścimy input, żeby można było zaimportować ten sam plik ponownie
  event.target.value = "";
});

function updateExerciseList() {
  const datalist = document.getElementById("exerciseList");
  if (!datalist) return; // nic nie robimy jeśli brak elementu

  const exerciseSet = new Set();
  days.forEach((day) => {
    Object.keys(day.exercises).forEach((name) => exerciseSet.add(name));
  });

  datalist.innerHTML = "";
  exerciseSet.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    datalist.appendChild(option);
  });
}

newDayForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const date = dayDateInput.value;
  if (!date || days.find((d) => d.date === date)) return;
  days.push({ date, exercises: {} });
  currentDay = date;
  saveToStorage();
  renderDaySelector();
  renderCurrentDay();
  dayDateInput.value = "";
});

daySelector.addEventListener("change", function () {
  currentDay = this.value;
  renderCurrentDay();
});

loadFromStorage();

renderDaySelector();
renderCurrentDay();

// Obsługa hamburgera
const hamburger = document.getElementById("hamburger");
const menu = document.getElementById("menu");

hamburger.addEventListener("click", () => {
  menu.classList.toggle("hidden");
});