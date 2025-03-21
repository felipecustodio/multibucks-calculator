// Global variables
let currencies = [];
let currentCurrency = null;
let packs = [];

// DOM elements
const tabTotal = document.getElementById('tab-total');
const tabItems = document.getElementById('tab-items');
const totalInput = document.getElementById('total-input');
const itemsInput = document.getElementById('items-input');
const amountInput = document.getElementById('amount');
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
const addItemBtn = document.getElementById('add-item-btn');
const itemsContainer = document.getElementById('items-container');
const itemsList = document.getElementById('items-list');
const itemsTotal = document.getElementById('items-total');
const resultsTable = document.getElementById('results-table');
const resultsBody = document.getElementById('results-body');
const resultsTotalPrice = document.querySelector('.price-value');
const totalMultibucks = document.getElementById('total-multibucks');
const resultsContainer = document.getElementById('results-container');
const noResults = document.getElementById('no-results');
const explanationToggle = document.getElementById('explanation-toggle');
const explanation = document.getElementById('explanation');
const currencySelect = document.getElementById('currency-select');
const currencyNameSpan = document.getElementById('currency-name');

// State
let activeTab = 'total';
let desiredAmount = 1000;
let items = [];
let totalMultibucksNeeded = 0;

// Create cursor glow element
const cursorGlow = document.createElement('div');
cursorGlow.className = 'cursor-glow';
document.body.appendChild(cursorGlow);

// Load currencies from JSON file
async function loadCurrencies() {
    try {
        const response = await fetch('currencies.json');
        const data = await response.json();
        currencies = data.currencies;

        // Populate currency dropdown
        populateCurrencyDropdown();

        // Set default currency (first in the list)
        if (currencies.length > 0) {
            setActiveCurrency(currencies[0].code);
        }
    } catch (error) {
        console.error('Error loading currencies:', error);
        // Fallback to default packs if currencies.json fails to load
        packs = [
            { id: 1, amount: 500, price: 23.95, bonus: 0, label: "500" },
            { id: 2, amount: 1150, price: 47.90, bonus: 0.15, label: "1150 (+15% bonus)" },
            { id: 3, amount: 2400, price: 95.80, bonus: 0.20, label: "2400 (+20% bonus)" },
            { id: 4, amount: 6250, price: 239.50, bonus: 0.25, label: "6250 (+25% bonus)" },
            { id: 5, amount: 13000, price: 479.00, bonus: 0.30, label: "13000 (+30% bonus)" }
        ];
        calculateResults();
    }
}

// Populate currency dropdown
function populateCurrencyDropdown() {
    currencySelect.innerHTML = '';
    currencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency.code;
        option.textContent = `${currency.name} (${currency.symbol})`;
        currencySelect.appendChild(option);
    });
}

// Set active currency
function setActiveCurrency(currencyCode) {
    currentCurrency = currencies.find(c => c.code === currencyCode);
    if (currentCurrency) {
        // Update packs with the currency's data
        packs = currentCurrency.packs.map(pack => ({
            ...pack,
            label: `${pack.amount}${pack.bonus > 0 ? ` (+${pack.bonus * 100}% bonus)` : ''}`
        }));

        // Update currency name in footer
        currencyNameSpan.textContent = currentCurrency.name;

        // Recalculate results with new currency
        calculateResults();
    }
}

// Update items list
function updateItemsList() {
    if (items.length > 0) {
        itemsContainer.classList.remove('hidden');
        itemsList.innerHTML = '';
        totalMultibucksNeeded = 0;

        items.forEach((item, index) => {
            totalMultibucksNeeded += item.price;

            const itemElement = document.createElement('div');
            itemElement.className = 'item';
            itemElement.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${item.price} Multibucks</span>
                </div>
                <button class="remove-btn" data-index="${index}">Remove</button>
            `;
            itemsList.appendChild(itemElement);
        });

        itemsTotal.textContent = `Total: ${totalMultibucksNeeded} Multibucks`;

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                items.splice(index, 1);
                updateItemsList();
                calculateResults();
            });
        });
    } else {
        itemsContainer.classList.add('hidden');
        totalMultibucksNeeded = 0;
    }
}

// Calculate optimal pack combination
function calculateBestCombination(targetAmount) {
    if (targetAmount <= 0) {
        return { packs: [], totalPrice: 0, totalMultibucks: 0 };
    }

    let remaining = targetAmount;
    let selectedPacks = [];
    let totalCost = 0;
    let totalMultibucks = 0;

    // Sort packs by amount in descending order
    const sortedPacks = [...packs].sort((a, b) => b.amount - a.amount);

    for (const pack of sortedPacks) {
        while (remaining >= pack.amount) {
            selectedPacks.push({ ...pack, quantity: 1 });
            remaining -= pack.amount;
            totalCost += pack.price;
            totalMultibucks += pack.amount;
        }
    }

    // If we still have some remaining amount and it's not zero, add the smallest pack
    if (remaining > 0) {
        const smallestPack = packs[0];
        selectedPacks.push({ ...smallestPack, quantity: 1 });
        totalCost += smallestPack.price;
        totalMultibucks += smallestPack.amount;
    }

    // Consolidate same packs
    const consolidatedPacks = {};
    selectedPacks.forEach(pack => {
        if (!consolidatedPacks[pack.id]) {
            consolidatedPacks[pack.id] = { ...pack };
        } else {
            consolidatedPacks[pack.id].quantity += pack.quantity;
        }
    });

    return {
        packs: Object.values(consolidatedPacks),
        totalPrice: totalCost,
        totalMultibucks: totalMultibucks
    };
}

// Update results display
function updateResults(result) {
    const { packs, totalPrice, totalMultibucks } = result;
    const targetAmount = activeTab === 'total' ? desiredAmount : totalMultibucksNeeded;

    if (packs.length > 0 && targetAmount > 0) {
        resultsContainer.classList.remove('hidden');
        noResults.classList.add('hidden');

        // Update table
        resultsBody.innerHTML = '';
        packs.forEach(pack => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${pack.label}</td>
                <td class="text-right">${pack.quantity}</td>
                <td class="text-right">${(pack.price * pack.quantity).toFixed(2)}</td>
            `;
            resultsBody.appendChild(row);
        });

        // Update totals with currency symbol
        const currencySymbol = currentCurrency ? currentCurrency.symbol : 'R$';
        resultsTotalPrice.textContent = `${currencySymbol}${totalPrice.toFixed(2)}`;

        let multibucksText = totalMultibucks;
        if (totalMultibucks > targetAmount) {
            multibucksText += ` <span class="extra">(+${totalMultibucks - targetAmount})</span>`;
        }
        totalMultibucks.innerHTML = multibucksText;
    } else {
        resultsContainer.classList.add('hidden');
        noResults.classList.remove('hidden');
    }
}

// Calculate and update results
function calculateResults() {
    let amount = 0;

    if (activeTab === 'total') {
        amount = desiredAmount;
    } else {
        amount = totalMultibucksNeeded;
    }

    const result = calculateBestCombination(amount);
    updateResults(result);
}

// Mouse trail effect
document.addEventListener("mousemove", (e) => {
  // For buttons, update custom properties for glow effect positioning
  const hoveredButton = document.querySelector("button:hover");

  if (hoveredButton) {
    cursorGlow.style.opacity = "1";
    cursorGlow.style.left = e.clientX + "px";
    cursorGlow.style.top = e.clientY + "px";

    const rect = hoveredButton.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    hoveredButton.style.setProperty("--x", x + "%");
    hoveredButton.style.setProperty("--y", y + "%");
  } else {
    cursorGlow.style.opacity = "0";
  }
});

document.addEventListener('mouseout', () => {
    cursorGlow.style.opacity = '0';
});

// Add ripple effect to all buttons
function addRippleEffect() {
  document.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", function (e) {
      // Create ripple element
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      this.appendChild(ripple);

      // Set position
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      // Apply styles to the ripple
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.classList.add("active");

      // Remove the ripple after animation completes
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
}

// Event listeners
function setupEventListeners() {
    // Currency dropdown change
    currencySelect.addEventListener('change', () => {
        setActiveCurrency(currencySelect.value);
    });

    // Tab switching
    tabTotal.addEventListener('click', () => {
        activeTab = 'total';
        tabTotal.classList.add('active');
        tabItems.classList.remove('active');
        totalInput.classList.remove('hidden');
        itemsInput.classList.add('hidden');
        calculateResults();
    });

    tabItems.addEventListener('click', () => {
        activeTab = 'items';
        tabItems.classList.add('active');
        tabTotal.classList.remove('active');
        itemsInput.classList.remove('hidden');
        totalInput.classList.add('hidden');
        calculateResults();
    });

    // Calculate by total
    amountInput.addEventListener('input', () => {
        desiredAmount = parseInt(amountInput.value) || 0;
        calculateResults();
    });

    // Add item
    addItemBtn.addEventListener('click', () => {
        const price = parseInt(itemPriceInput.value);
        if (price && price > 0) {
            const name = itemNameInput.value.trim() || `Item #${items.length + 1}`;
            items.push({ name, price });
            updateItemsList();
            itemNameInput.value = '';
            itemPriceInput.value = '';
            calculateResults();
        }
    });

    // Toggle explanation
    explanationToggle.addEventListener('click', () => {
        explanation.classList.toggle('active');
        explanationToggle.textContent = explanation.classList.contains('active') ?
            'Hide Explanation' : 'How does this calculator work?';
    });
}

// Initialize application
function initApp() {
    // Load currencies
    loadCurrencies();

    // Setup event listeners
    setupEventListeners();

    // Add ripple effect to buttons
    addRippleEffect();
}

// Start the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);