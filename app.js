/**
 * HourFlow - Mobile Hour & Expense Tracker
 * Core Javascript Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  // Set initial state from current date (June 2026 based on local metadata, or current client date)
  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  
  // Tab State
  let activeTab = 'hours'; // 'hours' or 'expenses'
  
  // Load entries from localStorage
  let entries = JSON.parse(localStorage.getItem('hourflow_entries')) || [];

  // Portuguese Month Names
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Hourly rate definition
  const HOURLY_RATE = 10;

  // ==========================================================================
  // DOM ELEMENTS
  // ==========================================================================
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const monthDisplay = document.getElementById('current-month-display');
  const monthSelect = document.getElementById('month-select');
  
  const netValueEl = document.getElementById('net-value');
  const totalHoursEl = document.getElementById('total-hours');
  const grossValueEl = document.getElementById('gross-value');
  const totalExpensesEl = document.getElementById('total-expenses');
  const totalCarriedEl = document.getElementById('total-carried');
  const totalPaidEl = document.getElementById('total-paid');
  
  const tabContainer = document.querySelector('.tab-container');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const hoursInputs = document.getElementById('hours-inputs');
  const expenseInputs = document.getElementById('expense-inputs');
  const submitBtn = document.getElementById('submit-btn');
  
  const entryForm = document.getElementById('entry-form');
  const entryDateInput = document.getElementById('entry-date');
  const hoursCountInput = document.getElementById('hours-count');
  const expenseAmountInput = document.getElementById('expense-amount');
  const expenseDescInput = document.getElementById('expense-desc');
  
  const paymentInputs = document.getElementById('payment-inputs');
  const paymentAmountInput = document.getElementById('payment-amount');
  const paymentDescInput = document.getElementById('payment-desc');
  
  const historyList = document.getElementById('history-list');
  const emptyState = document.getElementById('empty-state');
  const whatsappBtn = document.getElementById('whatsapp-btn');
  
  // Modal Elements
  const whatsappModal = document.getElementById('whatsapp-modal');
  const whatsappPreviewText = document.getElementById('whatsapp-preview-text');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const confirmWhatsappBtn = document.getElementById('confirm-whatsapp-btn');

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    setupMonthSelector();
    updateDateInputDefault();
    render();
    setupEventListeners();
  }

  // Pre-fill date picker to today's date formatted as YYYY-MM-DD
  function updateDateInputDefault() {
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    entryDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // Populate hidden month selector select list for quick access
  function setupMonthSelector() {
    monthSelect.innerHTML = '';
    
    // Create options for current year +/- 1 year (36 months total)
    const startYear = currentYear - 1;
    const endYear = currentYear + 1;
    
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        const option = document.createElement('option');
        option.value = `${y}-${m}`;
        option.textContent = `${MONTH_NAMES[m]} ${y}`;
        if (y === currentYear && m === currentMonth) {
          option.selected = true;
        }
        monthSelect.appendChild(option);
      }
    }
    updateMonthDisplay();
  }

  // Update display label based on state
  function updateMonthDisplay() {
    monthDisplay.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    
    // Sync the select dropdown value
    const targetVal = `${currentYear}-${currentMonth}`;
    const options = Array.from(monthSelect.options);
    const targetOption = options.find(opt => opt.value === targetVal);
    
    if (targetOption) {
      monthSelect.value = targetVal;
    } else {
      // If outside existing options, append dynamically
      const option = document.createElement('option');
      option.value = targetVal;
      option.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
      option.selected = true;
      monthSelect.appendChild(option);
      monthSelect.value = targetVal;
    }
  }

  // ==========================================================================
  // HELPERS: DATA & FORMATTING
  // ==========================================================================
  
  // Filter entries to only show the selected month
  function getFilteredEntries() {
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      // Safeguard date parsing issues
      if (isNaN(entryDate.getTime())) return false;
      return entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth;
    });
  }

  // Format currency to European standard (1.234,56 €)
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  // Format decimal hours nicely (e.g. 8h, 7.5h)
  function formatHours(hours) {
    // If hours is integer, show no decimal. Else, show up to 2 decimal places.
    const rounded = Math.round(hours * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded} h` : `${rounded.toString().replace('.', ',')} h`;
  }

  // Convert YYYY-MM-DD to DD/MM
  function formatDateShort(dateString) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    // Fallback if formatting fails
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // Convert YYYY-MM-DD to weekday and descriptive date
  function formatDateFriendly(dateString) {
    const d = new Date(dateString);
    // Add timezone offset to match date picker values
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(d.getTime() + userTimezoneOffset);
    
    const weekday = adjustedDate.toLocaleDateString('pt-PT', { weekday: 'short' });
    const day = adjustedDate.getDate();
    const month = adjustedDate.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '');
    
    // Capitalize weekday first letter
    const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${formattedWeekday}, ${day} ${month}`;
  }

  // ==========================================================================
  // BUSINESS LOGIC / RENDER
  // ==========================================================================
  function render() {
    const currentMonthEntries = getFilteredEntries();
    
    // 1. Calculate Carry-over from all previous months
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const previousEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      if (isNaN(entryDate.getTime())) return false;
      // Compare ignoring time components, just check if it's strictly before current month
      return entryDate.getFullYear() < currentYear || (entryDate.getFullYear() === currentYear && entryDate.getMonth() < currentMonth);
    });
    
    let prevHours = 0;
    let prevExpenses = 0;
    let prevPayments = 0;
    
    previousEntries.forEach(entry => {
      if (entry.type === 'hours') prevHours += Number(entry.hours) || 0;
      else if (entry.type === 'expenses') {
        if (entry.expenseNature === 'credit') prevExpenses -= Number(entry.amount) || 0;
        else prevExpenses += Number(entry.amount) || 0;
      }
      else if (entry.type === 'payments') prevPayments += Number(entry.amount) || 0;
    });
    
    const prevGross = prevHours * HOURLY_RATE;
    const previousBalance = prevGross - prevExpenses - prevPayments;
    
    // 2. Calculate Current Month Totals
    let totalHours = 0;
    let totalExpenses = 0;
    let totalPayments = 0;
    
    currentMonthEntries.forEach(entry => {
      if (entry.type === 'hours') {
        totalHours += Number(entry.hours) || 0;
      } else if (entry.type === 'expenses') {
        if (entry.expenseNature === 'credit') {
          totalExpenses -= Number(entry.amount) || 0;
        } else {
          totalExpenses += Number(entry.amount) || 0;
        }
      } else if (entry.type === 'payments') {
        totalPayments += Number(entry.amount) || 0;
      }
    });
    
    const grossEarnings = totalHours * HOURLY_RATE;
    const netAmount = previousBalance + grossEarnings - totalExpenses - totalPayments;
    
    // 3. Render Cards
    totalHoursEl.textContent = formatHours(totalHours);
    grossValueEl.textContent = formatCurrency(grossEarnings);
    totalExpensesEl.textContent = formatCurrency(totalExpenses);
    totalCarriedEl.textContent = formatCurrency(previousBalance);
    totalPaidEl.textContent = formatCurrency(totalPayments);
    
    netValueEl.textContent = formatCurrency(netAmount);
    // Apply styling if negative net amount (rare, but possible)
    if (netAmount < 0) {
      netValueEl.style.color = 'var(--color-error)';
    } else {
      netValueEl.style.color = 'var(--text-primary)';
    }
    
    // 3. Render History List
    // Sort entries by date descending, then by creation ID descending
    const sortedEntries = [...currentMonthEntries].sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return b.id - a.id;
    });
    
    if (sortedEntries.length === 0) {
      emptyState.style.display = 'flex';
      historyList.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      historyList.style.display = 'flex';
      
      // Update DOM with minimal operations
      historyList.innerHTML = '';
      sortedEntries.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.dataset.id = entry.id;
        
        let desc = '';
        let badgeClass = '';
        let badgeText = '';
        
        if (entry.type === 'hours') {
          desc = `Horas Trabalhadas`;
          badgeClass = 'badge-hours';
          badgeText = `+${formatHours(entry.hours)}`;
        } else if (entry.type === 'expenses') {
          desc = entry.description || 'Diversos';
          if (entry.expenseNature === 'credit') {
            badgeClass = 'badge-hours'; // green color like hours
            badgeText = `+${formatCurrency(entry.amount)}`;
          } else {
            badgeClass = 'badge-expense';
            badgeText = `-${formatCurrency(entry.amount)}`;
          }
        } else if (entry.type === 'payments') {
          desc = entry.description || 'Pagamento Recebido';
          badgeClass = 'badge-payment';
          badgeText = `+${formatCurrency(entry.amount)}`;
        }
        
        li.innerHTML = `
          <div class="item-meta">
            <span class="item-desc">${escapeHTML(desc)}</span>
            <span class="item-date">${formatDateFriendly(entry.date)}</span>
          </div>
          <div class="item-actions">
            <span class="item-badge ${badgeClass}">${badgeText}</span>
            <button class="delete-btn" aria-label="Eliminar registo">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
          </div>
        `;
        
        // Attach delete listener directly
        li.querySelector('.delete-btn').addEventListener('click', () => {
          handleDeleteEntry(entry.id, li);
        });
        
        historyList.appendChild(li);
      });
    }
  }

  // Escape HTML helper to prevent XSS injection
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // ==========================================================================
  // EVENT HANDLERS & LISTENERS
  // ==========================================================================
  function setupEventListeners() {
    // Month navigation buttons
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    
    // Month selector dropdown sync
    monthSelect.addEventListener('change', (e) => {
      const [year, month] = e.target.value.split('-').map(Number);
      currentYear = year;
      currentMonth = month;
      updateMonthDisplay();
      render();
    });
    
    // Tab switching
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        switchTab(tab);
      });
    });
    
    // Form submission
    entryForm.addEventListener('submit', handleFormSubmit);
    
    // WhatsApp Report Button
    whatsappBtn.addEventListener('click', handleWhatsAppExport);
    
    // Modal Close
    closeModalBtn.addEventListener('click', () => {
      whatsappModal.classList.add('hidden');
    });
  }

  function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    }
    setupMonthSelector();
    render();
  }

  function switchTab(tab) {
    if (activeTab === tab) return;
    activeTab = tab;
    
    // Update container attribute for active tab slide animation
    tabContainer.setAttribute('data-active-tab', tab);
    
    // Update active tab buttons states
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Swap form input fields
    if (tab === 'hours') {
      hoursInputs.classList.add('active');
      expenseInputs.classList.remove('active');
      paymentInputs.classList.remove('active');
      submitBtn.querySelector('span').textContent = 'Registar Horas';
      hoursCountInput.required = true;
      expenseAmountInput.required = false;
      paymentAmountInput.required = false;
    } else if (tab === 'expenses') {
      hoursInputs.classList.remove('active');
      expenseInputs.classList.add('active');
      paymentInputs.classList.remove('active');
      submitBtn.querySelector('span').textContent = 'Registar Diversos';
      hoursCountInput.required = false;
      expenseAmountInput.required = true;
      paymentAmountInput.required = false;
    } else {
      hoursInputs.classList.remove('active');
      expenseInputs.classList.remove('active');
      paymentInputs.classList.add('active');
      submitBtn.querySelector('span').textContent = 'Registar Pagamento';
      hoursCountInput.required = false;
      expenseAmountInput.required = false;
      paymentAmountInput.required = true;
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    
    const dateVal = entryDateInput.value;
    if (!dateVal) return;
    
    let newEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: dateVal
    };
    
    if (activeTab === 'hours') {
      const hours = parseFloat(hoursCountInput.value);
      if (isNaN(hours) || hours <= 0) return;
      newEntry.type = 'hours';
      newEntry.hours = hours;
      
      // Clear specific input
      hoursCountInput.value = '';
    } else if (activeTab === 'expenses') {
      const amount = parseFloat(expenseAmountInput.value);
      const desc = expenseDescInput.value.trim();
      const expenseNatureRadio = document.querySelector('input[name="expense-nature"]:checked');
      const expenseNature = expenseNatureRadio ? expenseNatureRadio.value : 'debit';
      
      if (isNaN(amount) || amount <= 0) return;
      newEntry.type = 'expenses';
      newEntry.amount = amount;
      newEntry.description = desc || 'Diversos';
      newEntry.expenseNature = expenseNature;
      
      // Clear specific inputs
      expenseAmountInput.value = '';
      expenseDescInput.value = '';
    } else if (activeTab === 'payments') {
      const amount = parseFloat(paymentAmountInput.value);
      const desc = paymentDescInput.value.trim();
      
      if (isNaN(amount) || amount <= 0) return;
      newEntry.type = 'payments';
      newEntry.amount = amount;
      newEntry.description = desc || 'Pagamento Recebido';
      
      paymentAmountInput.value = '';
      paymentDescInput.value = '';
    }
    
    // Store in global array
    entries.push(newEntry);
    localStorage.setItem('hourflow_entries', JSON.stringify(entries));
    
    // If the logged entry is in a different month/year, switch to that month/year to see it
    const entryDateObj = new Date(dateVal);
    if (!isNaN(entryDateObj.getTime())) {
      const entryYear = entryDateObj.getFullYear();
      const entryMonth = entryDateObj.getMonth();
      if (entryYear !== currentYear || entryMonth !== currentMonth) {
        currentYear = entryYear;
        currentMonth = entryMonth;
        setupMonthSelector();
      }
    }
    
    // Re-render
    render();
    
    // Focus button state animation feedback
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      <span>Registado!</span>
    `;
    submitBtn.style.backgroundColor = 'var(--color-success)';
    submitBtn.style.boxShadow = '0 0 24px var(--color-success-bg)';
    submitBtn.disabled = true;
    
    setTimeout(() => {
      submitBtn.innerHTML = originalContent;
      submitBtn.style.backgroundColor = '';
      submitBtn.style.boxShadow = '';
      submitBtn.disabled = false;
    }, 1200);
  }

  function handleDeleteEntry(id, element) {
    // Play exit animation
    element.classList.add('item-exit');
    
    // Wait for slide exit transition to complete before mutating state
    element.addEventListener('animationend', () => {
      entries = entries.filter(entry => entry.id !== id);
      localStorage.setItem('hourflow_entries', JSON.stringify(entries));
      render();
    }, { once: true });
  }

  // ==========================================================================
  // WHATSAPP EXPORT FUNCTIONALITY
  // ==========================================================================
  function handleWhatsAppExport() {
    const currentMonthEntries = getFilteredEntries();
    
    // Calculate previous balance
    const previousEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      if (isNaN(entryDate.getTime())) return false;
      return entryDate.getFullYear() < currentYear || (entryDate.getFullYear() === currentYear && entryDate.getMonth() < currentMonth);
    });
    
    let prevHours = 0; let prevExpenses = 0; let prevPayments = 0;
    previousEntries.forEach(entry => {
      if (entry.type === 'hours') prevHours += Number(entry.hours) || 0;
      else if (entry.type === 'expenses') {
        if (entry.expenseNature === 'credit') prevExpenses -= Number(entry.amount) || 0;
        else prevExpenses += Number(entry.amount) || 0;
      }
      else if (entry.type === 'payments') prevPayments += Number(entry.amount) || 0;
    });
    const previousBalance = (prevHours * HOURLY_RATE) - prevExpenses - prevPayments;

    let totalHours = 0; let totalExpenses = 0; let totalPayments = 0;
    currentMonthEntries.forEach(entry => {
      if (entry.type === 'hours') totalHours += Number(entry.hours) || 0;
      else if (entry.type === 'expenses') {
        if (entry.expenseNature === 'credit') totalExpenses -= Number(entry.amount) || 0;
        else totalExpenses += Number(entry.amount) || 0;
      } else if (entry.type === 'payments') totalPayments += Number(entry.amount) || 0;
    });
    
    const grossEarnings = totalHours * HOURLY_RATE;
    const netAmount = previousBalance + grossEarnings - totalExpenses - totalPayments;
    
    const chronologicalEntries = [...currentMonthEntries].sort((a, b) => a.date.localeCompare(b.date));
    
    // Uppercase month name for the header (ex: JUNHO 2026)
    const monthUpper = MONTH_NAMES[currentMonth].toUpperCase();
    
    // ── Cabeçalho minimalista ──
    let text = `EXTRATO  |  ${monthUpper} ${currentYear}\n\n`;
    
    // Saldo transitado (se existir)
    if (previousBalance !== 0) {
      text += `Saldo anterior   ${formatCurrency(previousBalance)}\n\n`;
    }
    
    // ── Movimentos: data   valor   descritivo ──
    if (chronologicalEntries.length > 0) {
      chronologicalEntries.forEach(entry => {
        const dateShort = formatDateShort(entry.date);
        
        if (entry.type === 'hours') {
          const value = Number(entry.hours) * HOURLY_RATE;
          const hoursLabel = formatHours(entry.hours).replace(' ', '');
          text += `${dateShort}   +${formatCurrency(value)}   Trabalho (${hoursLabel})\n`;
          
        } else if (entry.type === 'expenses') {
          const desc = entry.description || 'Diversos';
          if (entry.expenseNature === 'credit') {
            text += `${dateShort}   +${formatCurrency(entry.amount)}   ${desc}\n`;
          } else {
            text += `${dateShort}   -${formatCurrency(entry.amount)}   ${desc}\n`;
          }
          
        } else if (entry.type === 'payments') {
          const desc = entry.description || 'Recebido';
          text += `${dateShort}   -${formatCurrency(entry.amount)}   Pagamento (${desc})\n`;
        }
      });
    } else {
      text += `Sem movimentos registados este mês\n`;
    }
    
    // ── Rodapé ──
    text += `\n*TOTAL A RECEBER:  ${formatCurrency(netAmount)}*`;
    
    // Mostrar no Modal
    whatsappPreviewText.value = text;
    whatsappModal.classList.remove('hidden');
    
    confirmWhatsappBtn.onclick = () => {
      const finalMessage = whatsappPreviewText.value;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(finalMessage)}`;
      window.open(whatsappUrl, '_blank');
      whatsappModal.classList.add('hidden');
    };
  }

  // Run the app!
  init();
});
