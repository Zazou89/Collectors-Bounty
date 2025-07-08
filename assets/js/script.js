const CONFIG = {
    DEFAULT_MULTIPLIER: 10,
    MAX_ATTEMPTS: 100,
    TARGET_PERCENTAGES: [25, 50, 75, 90, 95, 99],
    DEFAULT_ICON: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
    DEBOUNCE_DELAY: 300
};

const elements = {};
let isMountSelected = false;

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
        return Math.min(100, parseFloat((baseRate * CONFIG.DEFAULT_MULTIPLIER).toFixed(2)));
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

function updateMountInfo(mount) {
    elements.mountName.textContent = mount.name;
    elements.mountSource.textContent = `Source: ${mount.boss} (${mount.location})`;
    elements.mountDropRate.innerHTML = createDropRateHTML(mount.dropRate);
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

    updateDropRateLabel(false);
    
    isMountSelected = false;

    elements.suggestions.style.display = "none";
}

function createDropRateHTML(baseRate) {
    function formatRate(rate) {
        if (rate === Math.round(rate)) {
            return rate.toString();
        } else if (rate === parseFloat(rate.toFixed(1))) {
            return rate.toFixed(1);
        } else {
            return rate.toFixed(2);
        }
    }
    
    return `Initial drop rate: ${formatRate(baseRate)}% 
    <span class="custom-tooltip">
        <span class="tooltip-trigger">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style="vertical-align: middle; margin-top: -2px;">
                <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1" fill="rgba(255,255,255,0.2)"/>
                <circle cx="9" cy="6" r="1.3" fill="currentColor"/>
                <rect x="8" y="8.5" width="2" height="5" fill="currentColor"/>
            </svg>
        </span>
            <span class="tooltip-content">Drop rates are community estimates from Wowhead users via the Wowhead client. While very helpful, these estimates may not be 100% accurate for all cases as Blizzard doesn't publish official rates for some mounts.</span>
    </span>`;
}

function updateMountIcon(iconUrl) {
    elements.mountIcon.src = iconUrl && iconUrl !== "" ? iconUrl : CONFIG.DEFAULT_ICON;
}

function updateDropRateLabel(hasMountSelected = false) {
    const label = document.querySelector('label[for="dropRate"]');
    const description = document.getElementById('dropRateDescription');
    
    if (!label) return;
    
    if (hasMountSelected) {
        label.textContent = "Drop rate with bonus (%):";
        
        if (!description) {
            const newDescription = document.createElement('small');
            newDescription.id = 'dropRateDescription';
            newDescription.className = 'field-description';
            newDescription.textContent = 'Default: x10 multiplier during event';
            label.parentNode.insertBefore(newDescription, label.nextSibling);
        }
    } else {
        label.textContent = "Drop rate (%):";
        
        if (description) {
            description.remove();
        }
    }
}

function selectMount(key) {
    const mount = mountData[key];
    if (!mount) return;
    
    const adjustedDropRate = MountCalculator.getAdjustedDropRate(mount.dropRate);
    
    elements.mountSearch.value = mount.name;
    elements.suggestions.style.display = "none";
    
    updateMountInfo(mount);
    document.getElementById("dropRate").value = adjustedDropRate;
    
    updateDropRateLabel(true);
    
    isMountSelected = true;
}

function getPercentageExplanation(percentage, attempts, dropRate) {
    const nextAttemptChance = MountCalculator.calculateChance(attempts + 1, dropRate);
    const attemptsFor90Percent = Math.ceil(Math.log(1 - 0.90) / Math.log(1 - dropRate/100));
    
    function formatPercentage(pct) {
        return pct >= 99.99 ? ">99.99%" : `${pct.toFixed(2)}%`;
    }
    
    const mainMessage = `Your chance after <strong>${attempts} attempts</strong>: <strong>${formatPercentage(percentage)}</strong> • Next run: <strong>${formatPercentage(nextAttemptChance)}</strong>`;
    
    let eventMessage = "";
    if (isMountSelected) {
        const baseDropRate = dropRate / CONFIG.DEFAULT_MULTIPLIER;
        const basePercentage = MountCalculator.calculateChance(attempts, baseDropRate);
        const bonusGain = percentage - basePercentage;
        eventMessage = `Without the event, you'd only have <strong>${formatPercentage(basePercentage)}</strong>.`;
    }
    
    let statisticalMessage;
    if (attempts > attemptsFor90Percent) {
        const attemptsFor99Percent = Math.ceil(Math.log(1 - 0.99) / Math.log(1 - dropRate/100));
        const attemptsFor999Percent = Math.ceil(Math.log(1 - 0.999) / Math.log(1 - dropRate/100));
        
        if (attempts > attemptsFor999Percent) {
            statisticalMessage = `You're in the <strong>unlucky 0.1%</strong> - congratulations, you've broken the game! Even Chuck Norris would give up by now.`;
        } else if (attempts > attemptsFor99Percent) {
            statisticalMessage = `You're in the <strong>unlucky 1%</strong> - legendary persistence! The mount will drop eventually.`;
        } else {
            statisticalMessage = `You're past the <strong>90% threshold</strong> - you're in the unlucky 10% but hang in there.`;
        }
    } else {
        const eventText = isMountSelected ? ` during Collector's Bounty event` : "";
        statisticalMessage = `Statistically, <strong>90% of players</strong> get this mount within <strong>${attemptsFor90Percent} attempts</strong>${eventText}.`;
    }
    
    const messages = [
        `<div style="margin-bottom: 8px;">${mainMessage}</div>`,
        eventMessage ? `<div style="margin-bottom: 8px;">${eventMessage}</div>` : "",
        `<div>${statisticalMessage}</div>`
    ].filter(msg => msg !== "");
    
    return messages.join("");
}

function displayResults(percentage, attempts) {
    const dropRate = parseFloat(document.getElementById("dropRate").value);

    let displayText;
    if (percentage >= 99.99) {
        displayText = ">99.99%";
    } else {
        displayText = `${percentage.toFixed(2)}%`;
    }
    
    elements.chancePercent.textContent = displayText;
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

        const rawPercentage = MountCalculator.calculateChance(
            parseInt(document.getElementById("tries").value),
            parseFloat(document.getElementById("dropRate").value)
        );
        const chancePercent = rawPercentage >= 99.99 ? ">99.99%" : `${rawPercentage.toFixed(2)}%`;


        const chanceDescription = document.getElementById('chanceDescription').innerHTML;
        const nextTargetValue = document.getElementById('nextTargetValue').textContent;
        const nextTargetDescription = document.getElementById('nextTargetDescription').innerHTML;
        const luckStatusValue = document.getElementById('luckStatusValue').textContent;
        const luckStatusDescription = document.getElementById('luckStatusDescription').textContent;
        
        const luckStatusCard = document.getElementById('luckStatusCard');
        let luckCardBackground = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
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
            document.getElementById("dropRate").value = "";
            updateDropRateLabel(false);
            isMountSelected = false;
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

    document.getElementById('shareBtn').addEventListener('click', handleScreenshot);
}

document.addEventListener('DOMContentLoaded', function() {
    initElements();
    initEventListeners();
});