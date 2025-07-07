const CONFIG = {
    BONUS_DROP_RATE: 5,
    MAX_ATTEMPTS: 100,
    TARGET_PERCENTAGES: [25, 50, 75, 90, 95, 99],
    DEFAULT_ICON: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
    DEBOUNCE_DELAY: 300
};

const elements = {};

function initElements() {
    elements.result = document.getElementById('result');
    elements.chancePercent = document.getElementById('chancePercent');
    elements.chanceDescription = document.getElementById('chanceDescription');
    elements.statsCards = document.getElementById('statsCards');
    elements.mountInfo = document.getElementById('mountInfo');
    elements.mountName = document.getElementById('mountName');
    elements.mountSource = document.getElementById('mountSource');
    elements.mountDropRate = document.getElementById('mountDropRate');
    elements.mountDifficulty = document.getElementById('mountDifficulty');
    elements.mountIcon = document.getElementById('mountIcon');
    elements.suggestions = document.getElementById('suggestions');
    elements.mountSearch = document.getElementById('mountSearch');
    elements.nextTargetValue = document.getElementById('nextTargetValue');
    elements.nextTargetDescription = document.getElementById('nextTargetDescription');
    elements.luckStatusValue = document.getElementById('luckStatusValue');
    elements.luckStatusDescription = document.getElementById('luckStatusDescription');
    elements.luckStatusCard = document.getElementById('luckStatusCard');
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function validateInputs(tries, dropRate) {
    const errors = [];
    if (!tries || tries < 1) errors.push("Attempts must be ≥ 1");
    if (!dropRate || dropRate <= 0 || dropRate > 100) {
        errors.push("Drop rate must be between 0.01-100%");
    }
    return errors;
}

function showError(message) {
    elements.chancePercent.textContent = "Error";
    elements.chanceDescription.textContent = message;
    elements.result.style.display = "block";
    elements.statsCards.classList.remove("show");
}

function setDropRateFieldState(disabled, fromMount = false) {
    const dropRateField = document.getElementById("dropRate");
    
    if (disabled) {
        dropRateField.disabled = true;
        dropRateField.style.opacity = "0.6";
        dropRateField.style.cursor = "not-allowed";
        if (fromMount) {
            dropRateField.title = "Drop rate automatically set from selected mount";
        }
    } else {
        dropRateField.disabled = false;
        dropRateField.style.opacity = "1";
        dropRateField.style.cursor = "auto";
        dropRateField.title = "";
    }
}

class MountCalculator {
    static calculateChance(attempts, dropRate) {
        const d = dropRate / 100;
        const chanceOfNotGetting = Math.pow(1 - d, attempts);
        return (1 - chanceOfNotGetting) * 100;
    }
    
    static getAttemptsForTarget(targetPercent, dropRate) {
        const d = dropRate / 100;
        return Math.log(1 - targetPercent / 100) / Math.log(1 - d);
    }
    
    static getAdjustedDropRate(baseRate) {
        return baseRate + CONFIG.BONUS_DROP_RATE;
    }
}

function getLuckStatus(percentage) {
    const clampedPercentage = Math.min(Math.max(percentage, 0), 99.999);
    
    return luckStatuses.find(status => clampedPercentage >= status.min && clampedPercentage < status.max) || luckStatuses[luckStatuses.length - 1];
}

function createExpansionHTML(expansion, mounts) {
    const mountsHTML = mounts
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(m => createMountItemHTML(m))
        .join("");
    
    return `<div class="category">${expansion}</div>${mountsHTML}`;
}

function createMountItemHTML(mount) {
    return `<div class="item" data-mount-key="${mount.key}">
        ${mount.name} 
        <span style="opacity: 0.7; font-size: 0.9em;">- ${mount.location}</span>
    </div>`;
}

function showSuggestions(val) {
    const filteredMounts = mounts.filter(m => 
        !val || m.name.toLowerCase().includes(val)
    );
    
    if (filteredMounts.length === 0) {
        elements.suggestions.style.display = "none";
        elements.suggestions.innerHTML = "";
        return;
    }
    
    const groupByExt = {};
    filteredMounts.forEach(m => {
        if (!groupByExt[m.ext]) groupByExt[m.ext] = [];
        groupByExt[m.ext].push(m);
    });
    
    elements.suggestions.style.display = "block";
    
    const sortedExtensions = Object.keys(groupByExt).sort((a, b) => {
        const indexA = expansionOrder.indexOf(a);
        const indexB = expansionOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
    
    elements.suggestions.innerHTML = sortedExtensions.map(ext =>
        createExpansionHTML(ext, groupByExt[ext])
    ).join("");
}

const debouncedShowSuggestions = debounce(showSuggestions, CONFIG.DEBOUNCE_DELAY);

function updateMountInfo(mount, adjustedDropRate) {
    elements.mountName.textContent = mount.name;
    elements.mountSource.textContent = `Source: ${mount.boss} (${mount.location})`;
    elements.mountDropRate.innerHTML = createDropRateHTML(mount.dropRate, adjustedDropRate);
    elements.mountDifficulty.textContent = `Difficulty: ${mount.difficulty}`;
    elements.mountInfo.style.display = "block";
    
    updateMountIcon(mount.iconUrl);

    let closeBtn = document.getElementById('mountCloseBtn');
    if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.id = 'mountCloseBtn';
        closeBtn.className = 'mount-close-btn';
        closeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="pointer-events: none;"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        closeBtn.onclick = clearMountSelection;
        elements.mountInfo.appendChild(closeBtn);
    }
    
    const typeBadge = document.getElementById('mountType');
    if (typeBadge) {
        typeBadge.remove();
    }
}

function clearMountSelection() {
    document.getElementById("tries").value = "";
    document.getElementById("dropRate").value = "";
    elements.mountSearch.value = "";

    elements.result.style.display = "none";
    elements.statsCards.classList.remove("show");
    elements.mountInfo.style.display = "none";
    document.getElementById("shareSection").style.display = "none";

    setDropRateFieldState(false);

    elements.suggestions.style.display = "none";
}

function createDropRateHTML(baseRate, adjustedRate) {
    return `Drop rate: ${baseRate.toFixed(1)}% + ${CONFIG.BONUS_DROP_RATE}% Bonus = ${adjustedRate.toFixed(1)}%`;
}

function updateMountIcon(iconUrl) {
    elements.mountIcon.src = iconUrl && iconUrl !== "" ? iconUrl : CONFIG.DEFAULT_ICON;
}

function selectMount(key) {
    const mount = mountData[key];
    if (!mount) return;
    
    const adjustedDropRate = Math.min(100, MountCalculator.getAdjustedDropRate(mount.dropRate));
    
    elements.mountSearch.value = mount.name;
    elements.suggestions.style.display = "none";
    
    updateMountInfo(mount, adjustedDropRate);
    document.getElementById("dropRate").value = adjustedDropRate;

    setDropRateFieldState(true, true);
}

function getPercentageExplanation(percentage, attempts, dropRate) {
    // Vérifier si on peut calculer le "without event"
    const canShowEventComparison = dropRate > CONFIG.BONUS_DROP_RATE;
    
    const nextAttemptChance = MountCalculator.calculateChance(attempts + 1, dropRate);
    const incrementalIncrease = nextAttemptChance - percentage;
    const attemptsFor90Percent = Math.ceil(Math.log(1 - 0.90) / Math.log(1 - dropRate/100));
    
    const mainMessage = `Your chance after <strong>${attempts} attempts</strong>: <strong>${percentage.toFixed(2)}%</strong> • Next run: <strong>${nextAttemptChance.toFixed(2)}%</strong>`;
    
    let eventMessage = "";
    if (canShowEventComparison) {
        const baseDropRate = dropRate - CONFIG.BONUS_DROP_RATE;
        const basePercentage = MountCalculator.calculateChance(attempts, baseDropRate);
        const bonusGain = percentage - basePercentage;
        eventMessage = `Without the event, you'd only have ${basePercentage.toFixed(2)}% (<strong>+${bonusGain.toFixed(2)}% boost!</strong>)`;
    }
    
    let statisticalMessage;
    if (attempts > attemptsFor90Percent) {
        const attemptsFor99Percent = Math.ceil(Math.log(1 - 0.99) / Math.log(1 - dropRate/100));
        if (attempts > attemptsFor99Percent) {
            statisticalMessage = `You're in the <strong>unlucky 1%</strong> - legendary persistence! The mount will drop eventually.`;
        } else {
            statisticalMessage = `You're past the <strong>90% threshold</strong> - you're in the unlucky 10% but hang in there.`;
        }
    } else {
        statisticalMessage = `Statistically, <strong>90% of players</strong> get this mount within <strong>${attemptsFor90Percent} attempts</strong> during Collector's Bounty event.`;
    }
    
    // Construire le message final
    const messages = [
        `<div style="margin-bottom: 8px;">${mainMessage}</div>`,
        eventMessage ? `<div style="margin-bottom: 8px;">${eventMessage}</div>` : "",
        `<div>${statisticalMessage}</div>`
    ].filter(msg => msg !== "");
    
    return messages.join("");
}

function displayResults(percentage, attempts) {
    const dropRate = parseFloat(document.getElementById("dropRate").value);
    elements.chancePercent.textContent = `${percentage.toFixed(2)}%`;
    elements.chanceDescription.innerHTML = getPercentageExplanation(percentage, attempts, dropRate);
}

function updateStatsCards(percentage, tries, dropRate) {
    updateNextTargetCard(percentage, tries, dropRate);
    updateLuckStatusCard(percentage);
}

function findNextTarget(percentage) {
    return CONFIG.TARGET_PERCENTAGES.find(target => percentage < target) || null;
}

function calculateAttemptsNeeded(targetPercentage, currentTries, dropRate) {
    const d = dropRate / 100;
    const targetAttemptsNeeded = Math.log(1 - targetPercentage / 100) / Math.log(1 - d);
    return Math.max(1, Math.ceil(targetAttemptsNeeded) - currentTries);
}

function updateNextTargetCard(percentage, tries, dropRate) {
    const nextTargetPercentage = findNextTarget(percentage);
    
    if (nextTargetPercentage) {
        const attemptsNeeded = calculateAttemptsNeeded(nextTargetPercentage, tries, dropRate);
        elements.nextTargetValue.textContent = `${attemptsNeeded} more runs`;
        elements.nextTargetDescription.innerHTML = `to reach <strong>${nextTargetPercentage}%</strong> chance of success.`;
    } else {
        elements.nextTargetValue.textContent = "Complete!";
        elements.nextTargetDescription.textContent = "You've achieved legendary luck status!";
    }
}

function updateLuckStatusCard(percentage) {
    const status = getLuckStatus(percentage);
    elements.luckStatusValue.textContent = status.status;
    elements.luckStatusDescription.textContent = status.desc;
    
    elements.luckStatusCard.classList.remove('luck-good-bg', 'luck-average-bg', 'luck-bad-bg');

    elements.luckStatusCard.classList.add(`luck-${status.type}-bg`);
}

function calculateChances() {
    const tries = parseInt(document.getElementById("tries").value);
    const dropRate = parseFloat(document.getElementById("dropRate").value);
    
    const errors = validateInputs(tries, dropRate);
    if (errors.length > 0) {
        showError(errors.join(". "));
        return;
    }
    
    const chanceOfGetting = MountCalculator.calculateChance(tries, dropRate);
    
    displayResults(chanceOfGetting, tries);
    updateStatsCards(chanceOfGetting, tries, dropRate);
    
    elements.result.style.display = 'block';
    elements.statsCards.classList.add("show");
    document.getElementById("shareSection").style.display = "block";
}

function handleScreenshot() {
    const button = this;
    const originalText = button.textContent;
    button.textContent = 'Generating...';
    button.disabled = true;

    setTimeout(() => {
        const result = document.getElementById('result');
        const statsCards = document.getElementById('statsCards');
        
        if (result.style.display === 'none' || !statsCards.classList.contains('show')) {
            button.textContent = 'No results';
            button.disabled = false;
            setTimeout(() => button.textContent = originalText, 4000);
            return;
        }

        const chancePercent = document.getElementById('chancePercent').textContent;
        const chanceDescription = document.getElementById('chanceDescription').innerHTML;
        const nextTargetValue = document.getElementById('nextTargetValue').textContent;
        const nextTargetDescription = document.getElementById('nextTargetDescription').innerHTML;
        const luckStatusValue = document.getElementById('luckStatusValue').textContent;
        const luckStatusDescription = document.getElementById('luckStatusDescription').textContent;
        
        const luckStatusCard = document.getElementById('luckStatusCard');
        let luckCardBackground = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'; // default good
        if (luckStatusCard.classList.contains('luck-average-bg')) {
            luckCardBackground = 'linear-gradient(135deg, #e6ad41 0%, #dd6b20 100%)';
        } else if (luckStatusCard.classList.contains('luck-bad-bg')) {
            luckCardBackground = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
        }
        
        const mountInfo = document.getElementById('mountInfo');
        let mountHTML = '';
        if (mountInfo && mountInfo.style.display !== 'none') {
            const mountName = document.getElementById('mountName').textContent;
            const mountSource = document.getElementById('mountSource').textContent;
            const mountDropRate = document.getElementById('mountDropRate').innerHTML;
            const mountDifficulty = document.getElementById('mountDifficulty').textContent;
            
            const mountIcon = document.getElementById('mountIcon');
            let iconHTML = '';
            if (mountIcon && mountIcon.src && mountIcon.src !== CONFIG.DEFAULT_ICON && mountIcon.complete && mountIcon.naturalWidth > 0) {
                iconHTML = `<img src="${mountIcon.src}" style="width: 56px; height: 56px; border-radius: 10px; object-fit: contain; border: 1px solid rgba(255, 255, 255, 0.2); background-color: rgba(255, 255, 255, 0.15); flex-shrink: 0;">`;
            }
            
            mountHTML = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 15px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        ${iconHTML}
                        <div style="flex-grow: 1;">
                            <h3 style="margin: 0 0 5px 0; font-size: 1.3em; font-weight: 600; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);">${mountName}</h3>
                            <p style="margin: 0; opacity: 0.9; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);">${mountSource}</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <span style="background: rgba(255, 255, 255, 0.2); padding: 8px 15px; border-radius: 25px; font-weight: 600; backdrop-filter: blur(10px);">${mountDifficulty}</span>
                        <span style="background: rgba(255, 255, 255, 0.2); padding: 8px 15px; border-radius: 25px; font-weight: 600; backdrop-filter: blur(10px);">${mountDropRate}</span>
                    </div>
                </div>
            `;
        }

        const fullHTML = `
            <div style="background: rgba(26, 32, 46, 0.95); padding: 30px; border-radius: 20px; color: #e2e8f0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px;">
                <h2 style="text-align: center; margin: 0 0 20px 0; color: #e2e8f0; font-size: 1.8em;">Collector's Bounty</h2>
                
                ${mountHTML}
                
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00d4fe 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; font-weight: 500; font-size: 1.2em;">
                    <div style="font-size: 3em; font-weight: bold; margin-bottom: 15px;">${chancePercent}</div>
                    <div style="font-size: 0.85em; opacity: 0.9; line-height: 1.6;">${chanceDescription}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 20px; text-align: center;">
                        <div style="font-size: 2em; font-weight: 800; margin-bottom: 15px;">${nextTargetValue}</div>
                        <div style="opacity: 0.9; font-weight: 500;">${nextTargetDescription}</div>
                    </div>
                    <div style="background: ${luckCardBackground}; color: white; padding: 30px; border-radius: 20px; text-align: center;">
                        <div style="font-size: 2em; font-weight: 800; margin-bottom: 15px;">${luckStatusValue}</div>
                        <div style="opacity: 0.9; font-weight: 500;">${luckStatusDescription}</div>
                    </div>
                </div>
            </div>
        `;

        const captureDiv = document.createElement('div');
        captureDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;';
        captureDiv.innerHTML = fullHTML;

        document.body.appendChild(captureDiv);

        html2canvas(captureDiv, {
            backgroundColor: null,
            logging: false
        }).then(canvas => {
            canvas.toBlob(blob => {
                navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    button.textContent = 'Copied! Press Ctrl+V to paste';
                    setTimeout(() => button.textContent = originalText, 5000);
                }).catch(err => {
                    console.error('Erreur copie:', err);
                    button.textContent = 'Clipboard failed - try again';
                    setTimeout(() => button.textContent = originalText, 5000);
                });
            }, 'image/png');
            
            document.body.removeChild(captureDiv);
            button.disabled = false;
        }).catch(err => {
            console.error('Erreur capture:', err);
            document.body.removeChild(captureDiv);
            button.textContent = 'Error - try again';
            setTimeout(() => button.textContent = originalText, 2000);
            button.disabled = false;
        });
    }, 100);
}

function initEventListeners() {
    elements.mountSearch.addEventListener("input", e => {
        const value = e.target.value.trim().toLowerCase();

        if (value === "") {
            elements.mountInfo.style.display = "none";
            setDropRateFieldState(false);
            document.getElementById("dropRate").value = "";
        }
        
        debouncedShowSuggestions(value);
    });
    
    elements.mountSearch.addEventListener("focus", () =>
        showSuggestions("")
    );
    
    elements.suggestions.addEventListener("mousedown", (e) => {
        const itemElement = e.target.closest('.item');
        if (itemElement) {
            const key = itemElement.dataset.mountKey;
            selectMount(key);
        }
    });
    
    document.querySelector('.calculate-btn').addEventListener('click', calculateChances);
    
    document.addEventListener("keypress", (e) => {
        if (e.key === "Enter") calculateChances();
    });
    
    document.addEventListener('click', function(e) {
        if (!elements.suggestions.contains(e.target) && e.target !== elements.mountSearch) {
            elements.suggestions.style.display = 'none';
        }
    });

    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('shareBtn').addEventListener('click', handleScreenshot);
}

document.addEventListener('DOMContentLoaded', function() {
    initElements();
    initEventListeners();
});