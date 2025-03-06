// Constants and Data
const TAX_BRACKETS = {
  IN: [
    { min: 14401, max: 19200, rate: 0.15 },
    { min: 19201, max: 24000, rate: 0.2 },
    { min: 24001, max: 28800, rate: 0.25 },
    { min: 28801, max: null, rate: 0.30 }
  
  ],
  US: [
    { min: 0, max: 11000, rate: 0.1 },
    { min: 11001, max: 44725, rate: 0.12 },
    { min: 44726, max: 95375, rate: 0.22 },
    { min: 95376, max: 182100, rate: 0.24 },
    { min: 182101, max: 231250, rate: 0.32 },
    { min: 231251, max: 578125, rate: 0.35 },
    { min: 578126, max: null, rate: 0.37 },
  ],
  UK: [
    { min: 0, max: 12570, rate: 0 },
    { min: 12571, max: 50270, rate: 0.2 },
    { min: 50271, max: 125140, rate: 0.4 },
    { min: 125141, max: null, rate: 0.45 },
  ],
  CA: [
    { min: 0, max: 53359, rate: 0.15 },
    { min: 53360, max: 106717, rate: 0.205 },
    { min: 106718, max: 165430, rate: 0.26 },
    { min: 165431, max: 235675, rate: 0.29 },
    { min: 235676, max: null, rate: 0.33 },
  ],
};

const CATEGORY_MODIFIERS = {
  individual: { rate: 1, description: 'Standard tax rate applies' },
  business: { rate: 0.9, description: '10% tax benefit for registered businesses' },
  freelancer: { rate: 0.95, description: '5% tax benefit for self-employed individuals' },
};

const COUNTRY_NAMES = {
  IN: 'India',
  US: 'United States',
  UK: 'United Kingdom',
  CA: 'Canada',
};

// State Management
let state = {
  category: 'individual',
  country: 'US',
  income: 0,
  expenses: 0,
  deductions: {
    medical: 0,
    charity: 0,
    education: 0,
    retirement: 0,
    homeOffice: 0,
  },
  showDeductions: true,
  showTaxBrackets: false,
  calculationHistory: [],
};

// Helper Functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateTaxByBrackets(taxableIncome, country) {
  let totalTax = 0;
  const brackets = TAX_BRACKETS[country];

  for (let i = 0; i < brackets.length; i++) {
    const { min, max, rate } = brackets[i];
    if (taxableIncome > min) {
      const bracketMax = max ?? Infinity;
      const taxableInBracket = Math.min(taxableIncome - min, bracketMax - min);
      totalTax += taxableInBracket * rate;
    }
  }

  return totalTax;
}

function getTaxBracket(income, country) {
  return (
    TAX_BRACKETS[country].find(
      (bracket) =>
        income >= bracket.min && (bracket.max === null || income <= bracket.max)
    ) || TAX_BRACKETS[country][0]
  );
}

function getNextBracketThreshold(income, country) {
  const currentBracket = getTaxBracket(income, country);
  const nextBracket = TAX_BRACKETS[country].find(
    (bracket) => bracket.min > currentBracket.min
  );
  return nextBracket ? nextBracket.min : null;
}

function calculateTaxResults() {
  const totalDeductions = Object.values(state.deductions).reduce(
    (a, b) => a + b,
    0
  );
  const taxableIncome = Math.max(
    0,
    state.income - state.expenses - totalDeductions
  );
  const baseTax = calculateTaxByBrackets(taxableIncome, state.country);
  const adjustedTax = baseTax * CATEGORY_MODIFIERS[state.category].rate;
  const currentBracket = getTaxBracket(taxableIncome, state.country);

  return {
    grossIncome: state.income,
    totalDeductions,
    taxableIncome,
    taxAmount: adjustedTax,
    effectiveRate:
      taxableIncome > 0
        ? ((adjustedTax / state.income) * 100).toFixed(2)
        : '0.00',
    marginalRate: (currentBracket.rate * 100).toFixed(2),
    categoryDiscount: ((1 - CATEGORY_MODIFIERS[state.category].rate) * 100).toFixed(
      1
    ),
    nextBracketThreshold: getNextBracketThreshold(taxableIncome, state.country),
  };
}

// UI Update Functions
function updateUI() {
  const results = calculateTaxResults();

  // Update summary values
  document.getElementById('taxable-income').textContent = formatCurrency(
    results.taxableIncome
  );
  document.getElementById('effective-rate').textContent = `${results.effectiveRate}%`;
  document.getElementById('tax-amount').textContent = formatCurrency(
    results.taxAmount
  );
  document.getElementById('gross-income').textContent = formatCurrency(
    results.grossIncome
  );
  document.getElementById('total-deductions').textContent = formatCurrency(
    results.totalDeductions
  );
  document.getElementById('marginal-rate').textContent = `${results.marginalRate}%`;
  document.getElementById('category-discount').textContent = `${results.categoryDiscount}%`;

  // Update next bracket threshold
  const nextBracketElement = document.getElementById('next-bracket');
  if (results.nextBracketThreshold) {
    nextBracketElement.textContent = `Next tax bracket at: ${formatCurrency(
      results.nextBracketThreshold
    )}`;
  } else {
    nextBracketElement.textContent = 'Highest tax bracket reached';
  }

  // Update country display
  document.getElementById('selected-country').textContent =
    COUNTRY_NAMES[state.country];
  document.getElementById('brackets-country').textContent =
    COUNTRY_NAMES[state.country];

  // Update category description
  document.getElementById('category-description').textContent =
    CATEGORY_MODIFIERS[state.category].description;

  // Update tax brackets
  updateTaxBrackets();
}

function updateTaxBrackets() {
  const bracketsContainer = document.getElementById('brackets-list');
  bracketsContainer.innerHTML = '';

  const results = calculateTaxResults();
  TAX_BRACKETS[state.country].forEach((bracket) => {
    const div = document.createElement('div');
    div.className = `p-3 rounded-lg ${
      results.taxableIncome >= bracket.min &&
      (!bracket.max || results.taxableIncome <= bracket.max)
        ? 'bg-indigo-50 border border-indigo-200'
        : 'bg-gray-50'
    }`;

    div.innerHTML = `
      <div class="flex justify-between text-sm">
        <span>${formatCurrency(bracket.min)} - ${
      bracket.max ? formatCurrency(bracket.max) : '∞'
    }</span> }</span>
        <span class="font-medium">${(bracket.rate * 100).toFixed(1)}%</span>
      </div>
    `;

    bracketsContainer.appendChild(div);
  });
}

// Event Handlers
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI
  updateUI();

  // Tax Category Selection
  document.querySelectorAll('.tax-category-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      state.category = category;

      // Update button styles
      document.querySelectorAll('.tax-category-btn').forEach((b) => {
        if (b.dataset.category === category) {
          b.className =
            'tax-category-btn flex flex-col items-center p-4 rounded-lg border transition-all border-indigo-500 bg-indigo-50 shadow-sm';
          b.querySelector('svg').className = 'h-6 w-6 mb-2 text-indigo-600';
          b.querySelector('span').className = 'text-sm text-indigo-700';
        } else {
          b.className =
            'tax-category-btn flex flex-col items-center p-4 rounded-lg border transition-all border-gray-200 hover:border-indigo-200 hover:bg-gray-50';
          b.querySelector('svg').className = 'h-6 w-6 mb-2 text-gray-500';
          b.querySelector('span').className = 'text-sm text-gray-600';
        }
      });

      updateUI();
    });
  });

  // Country Selection
  document.getElementById('country').addEventListener('change', (e) => {
    state.country = e.target.value;
    updateUI();
  });

  // Income and Expenses
  document.getElementById('income').addEventListener('input', (e) => {
    state.income = Number(e.target.value) || 0;
    updateUI();
  });

  document.getElementById('expenses').addEventListener('input', (e) => {
    state.expenses = Number(e.target.value) || 0;
    updateUI();
  });

  // Deductions
  ['medical', 'charity', 'education', 'retirement', 'homeOffice'].forEach(
    (type) => {
      document.getElementById(type).addEventListener('input', (e) => {
        state.deductions[type] = Number(e.target.value) || 0;
        updateUI();
      });
    }
  );

  // Toggle Deductions
  document.getElementById('toggle-deductions').addEventListener('click', () => {
    state.showDeductions = !state.showDeductions;
    const deductionsForm = document.getElementById('deductions-form');
    const toggleBtn = document.getElementById('toggle-deductions');
    
    if (state.showDeductions) {
      deductionsForm.style.display = 'block';
      toggleBtn.textContent = 'Hide';
    } else {
      deductionsForm.style.display = 'none';
      toggleBtn.textContent = 'Show';
    }
  });

  // Show Tax Brackets Button
  document.getElementById('show-tax-brackets').addEventListener('click', () => {
    state.showTaxBrackets = !state.showTaxBrackets;
    const bracketsSection = document.getElementById('tax-brackets');
    bracketsSection.classList.toggle('hidden');
    updateTaxBrackets();
  });

  // Close Tax Brackets
  document.getElementById('close-brackets').addEventListener('click', () => {
    state.showTaxBrackets = false;
    document.getElementById('tax-brackets').classList.add('hidden');
  });

  document.getElementById('download-report').addEventListener('click', async () => {
    const results = calculateTaxResults();

    const report = {
        timestamp: new Date().toISOString(),
        taxpayerInfo: {
            category: state.category,
            jurisdiction: COUNTRY_NAMES[state.country],
        },
        financialData: {
            grossIncome: state.income,
            expenses: state.expenses,
            deductions: state.deductions,
        },
        calculations: results,
        taxBrackets: TAX_BRACKETS[state.country],
        categoryBenefits: CATEGORY_MODIFIERS[state.category],
    };

    try {
        const response = await fetch('/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(report),
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(`Failed to generate PDF: ${errorData.error}`);
            return;
        }

        // Handle PDF file download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `tax-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
});


  // Save Calculation
  document.getElementById('save-calculation').addEventListener('click', () => {
    const results = calculateTaxResults();
    state.calculationHistory.push({
      date: new Date(),
      result: results,
    });

    // Show history section if hidden
    const historySection = document.getElementById('calculation-history');
    historySection.classList.remove('hidden');

    // Update history list
    const historyList = document.getElementById('history-list');
    const historyItem = document.createElement('div');
    historyItem.className = 'p-3 bg-gray-50 rounded-lg';
    historyItem.innerHTML = `
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">${new Date().toLocaleString()}</span>
        <span class="font-medium">${formatCurrency(results.taxAmount)}</span>
      </div>
    `;
    historyList.insertBefore(historyItem, historyList.firstChild);
  });
});