// Dark Mode Toggle
const darkModeToggle = document.getElementById("darkModeToggle");
if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    darkModeToggle.textContent = document.body.classList.contains("dark-mode")
      ? "☀️ Toggle Light Mode"
      : "🌙 Toggle Dark Mode";
  });
}

// Show/hide custom draw rate input
document.getElementById("device").addEventListener("change", function () {
  document.getElementById("customDrawRateContainer").style.display =
    this.value === "custom" ? "block" : "none";
});

// Calculation explanation modal logic
const modal = document.getElementById("calcModal");
const span = document.getElementsByClassName("close")[0];
document.getElementById("calcHelp").onclick = () => {
  modal.style.display = "block";
  return false;
};
span.onclick = () => (modal.style.display = "none");
window.onclick = (event) => {
  if (event.target == modal) modal.style.display = "none";
};

document
  .getElementById("batteryForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const device = document.getElementById("device").value;
    const capacity = parseFloat(document.getElementById("capacity").value);
    const charging = parseFloat(document.getElementById("charging").value);
    const usage = parseFloat(document.getElementById("usage").value);
    const brightness = parseFloat(document.getElementById("brightness").value);

    // New inputs
    const batteryAge =
      parseFloat(document.getElementById("batteryAge").value) || 0; // in months
    const temperature =
      parseFloat(document.getElementById("temperature").value) || 25; // °C
    const usagePattern = document.getElementById("usagePattern").value;

    // Custom device draw rate
    const customDrawRate = parseFloat(
      document.getElementById("customDrawRate").value
    );

    const resultDiv = document.getElementById("result");
    const tipsDiv = document.getElementById("tips");
    const batteryGauge = document.getElementById("batteryGauge");
    const batteryHealthEl = document.getElementById("batteryHealth");
    const timeLeftEl = document.getElementById("timeLeft");

    // Power draw per hour at 100% brightness (mAh/hour) for different devices
    const deviceDrawFactor = {
      smartphone: 300,
      laptop: 1200,
      tablet: 600,
      wearable: 80,
    };

    // Validate capacity and usage values
    if (isNaN(capacity) || capacity <= 0) {
      resultDiv.innerHTML = "Please enter a valid battery capacity.";
      tipsDiv.innerHTML = "";
      return;
    }
    if (isNaN(usage) || usage <= 0) {
      resultDiv.innerHTML = "Please enter a valid usage hours.";
      tipsDiv.innerHTML = "";
      return;
    }

    // Calculate draw rate adjusted by brightness
    let drawRate;
    if (device === "custom") {
      if (isNaN(customDrawRate) || customDrawRate <= 0) {
        resultDiv.innerHTML = "Please enter a valid custom power draw.";
        tipsDiv.innerHTML = "";
        batteryGauge.value = 0;
        batteryHealthEl.textContent = "";
        timeLeftEl.textContent = "";
        return;
      }
      drawRate = customDrawRate * (brightness / 100);
    } else {
      drawRate = (deviceDrawFactor[device] || 300) * (brightness / 100); // mAh/hour
    }

    if (drawRate <= 0) {
      resultDiv.innerHTML = "Screen brightness too low to calculate runtime.";
      tipsDiv.innerHTML = "";
      batteryGauge.value = 0;
      batteryHealthEl.textContent = "";
      timeLeftEl.textContent = "";
      return;
    }

    // Calculate runtime per full charge (hours)
    const runtimePerCharge = capacity / drawRate;

    // Estimate realistic full charge cycles per day (usually charging count per day)
    // Limit charging frequency realistically: max 1 cycle per day is standard.
    // Charging multiple times a day usually doesn't add full cycles linearly.
    const fullChargeCyclesPerDay = Math.min(charging, 1);

    // Safe cycles per day: fallback minimum to avoid division by zero
    const safeCyclesPerDay =
      fullChargeCyclesPerDay > 0 ? fullChargeCyclesPerDay : 0.1;

    // Typical max charge cycles before battery degrades significantly
    let maxCycles = 500;

    // Battery health drops roughly 1% per month — scale max cycles accordingly
    maxCycles *= Math.max(0.5, 1 - batteryAge * 0.01);

    // Adjust maxCycles based on operating temperature
    // Ideal temp ~25°C; degradation faster if temp > 30 or < 10
    if (temperature > 30) {
      const tempPenalty = Math.min((temperature - 30) * 0.05, 0.3); // up to 30% penalty
      maxCycles *= 1 - tempPenalty;
    } else if (temperature < 10) {
      const tempPenalty = Math.min((10 - temperature) * 0.03, 0.15); // up to 15% penalty
      maxCycles *= 1 - tempPenalty;
    }

    // Adjust maxCycles based on usage pattern
    switch (usagePattern) {
      case "light":
        maxCycles *= 1.1; // light users get slight bonus
        break;
      case "moderate":
        // no change
        break;
      case "heavy":
        maxCycles *= 0.85; // heavy usage reduces cycles by 15%
        break;
    }

    // Estimate battery lifespan in days = (maxCycles / cycles per day)
    const estimatedDays = maxCycles / safeCyclesPerDay;

    // Battery health percentage: relative to typical 2 years lifespan (~730 days)
    // Clamp between 0 and 100%
    const batteryHealthPercent = Math.min(
      Math.max((estimatedDays / 730) * 100, 0),
      100
    );

    // Display results
    resultDiv.innerHTML = `
      Runtime per full charge: <strong>${runtimePerCharge.toFixed(
        1
      )} hours</strong><br>
      Estimated battery lifespan: <strong>${estimatedDays.toFixed(
        1
      )} days</strong>
      <br>Remaining Charge Cycles: <strong>${Math.round(
        maxCycles
      )}</strong> (out of 500 typical)
    `;

    // Update battery gauge value and color
    const gaugeValue = Math.max(0, Math.min(batteryHealthPercent, 100));
    batteryGauge.value = gaugeValue;

    let color = "";
    let healthText = "";
    if (gaugeValue > 75) {
      color = "#4caf50";
      healthText = "Battery Health: Excellent 🟢";
    } else if (gaugeValue > 50) {
      color = "#ffeb3b";
      healthText = "Battery Health: Good 🟡";
    } else if (gaugeValue > 30) {
      color = "#ff9800";
      healthText = "Battery Health: Moderate 🟠";
    } else {
      color = "#f44336";
      healthText = "Battery Health: Poor 🔴";
    }

    batteryGauge.style.setProperty("--progress-color", color);

    if (batteryHealthEl) {
      batteryHealthEl.textContent = healthText;
      batteryHealthEl.style.color = color;
    }

    if (timeLeftEl) {
      const months = Math.floor(estimatedDays / 30);
      const days = Math.floor(estimatedDays % 30);
      timeLeftEl.textContent = `Estimated time left: ${months} month(s) and ${days} day(s)`;
      timeLeftEl.style.color = color;
    }

    // ---- Tips with explanations ----
    const tips = [];
    const tipExplanations = [];

    function addTip(tip, explanationKey) {
      tips.push(tip);
      tipExplanations.push(explanationKey);
    }

    const explanations = {
      "reduce-brightness":
        "High screen brightness increases power consumption and heat, which can accelerate battery wear. Lowering brightness helps extend battery life.",
      "avoid-frequent-charging":
        "Charging your device too often (especially more than 3 times a day) can increase the number of charge cycles, wearing out the battery faster.",
      "limit-heavy-usage":
        "Using your device heavily for long periods increases the number of charge cycles and heat, both of which reduce battery lifespan.",
      "low-capacity":
        "Devices with low battery capacity may require more frequent charging, leading to faster battery degradation.",
      "avoid-use-while-charging":
        "Using your phone while charging generates extra heat and can stress the battery, reducing its overall lifespan.",
      "replace-old-battery":
        "Most lithium-ion batteries degrade noticeably after 2–3 years. Replacing an old battery restores performance and safety.",
      "high-temp":
        "Operating your device at high temperatures (above 35°C) accelerates chemical reactions that degrade battery health.",
      "heavy-usage-pattern":
        "A heavy usage pattern (like gaming or video streaming) increases the number of charge cycles and heat, reducing battery life.",
      "critical-health":
        "When battery health drops below 30%, it may no longer hold charge well or operate safely. Professional replacement is recommended.",
    };

    if (brightness > 80)
      addTip("Reduce screen brightness to save battery.", "reduce-brightness");
    if (charging > 3)
      addTip(
        "Avoid frequent charging to reduce battery wear.",
        "avoid-frequent-charging"
      );
    if (usage > 8)
      addTip(
        "Try to limit heavy usage to prolong battery life.",
        "limit-heavy-usage"
      );
    if (capacity < 2000)
      addTip("Consider devices with higher battery capacity.", "low-capacity");
    if (device === "smartphone")
      addTip(
        "Avoid using the phone while charging.",
        "avoid-use-while-charging"
      );
    if (batteryAge > 24)
      addTip(
        "Consider replacing the battery; it's quite old.",
        "replace-old-battery"
      );
    if (temperature > 35)
      addTip(
        "High operating temperature can reduce battery life.",
        "high-temp"
      );
    if (usagePattern === "heavy")
      addTip(
        "Heavy usage may significantly shorten battery lifespan.",
        "heavy-usage-pattern"
      );
    if (batteryHealthPercent <= 30)
      addTip(
        "⚠️ Consider professional battery replacement - health is critical!",
        "critical-health"
      );

    // Render tips with [Why?] links
    if (tips.length > 0) {
      let tipsHtml = `<strong>Tips:</strong><br>`;
      tips.forEach((tip, i) => {
        const key = tipExplanations[i];
        tipsHtml += `<div class="tip-item">${tip} <span class="tip-why" data-tip="${i}">[Why?]</span>
          <div class="tip-explanation" id="tip-exp-${i}">${explanations[key]}</div>
        </div>`;
      });
      tipsDiv.innerHTML = tipsHtml;
    } else {
      tipsDiv.innerHTML = "<strong>No tips required. Good usage!</strong>";
    }

    // Add event listeners for [Why?] links
    setTimeout(() => {
      document.querySelectorAll(".tip-why").forEach((el) => {
        el.addEventListener("click", function () {
          const idx = this.getAttribute("data-tip");
          const expl = document.getElementById("tip-exp-" + idx);
          if (expl)
            expl.style.display =
              expl.style.display === "block" ? "none" : "block";
        });
      });
    }, 10);
  });
