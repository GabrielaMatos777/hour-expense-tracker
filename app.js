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
  const pdfBtn = document.getElementById('pdf-btn');
  const calendarGrid = document.getElementById('calendar-grid');
  const selectedDateLabel = document.getElementById('selected-date-label');
  
  // Modal Elements
  const whatsappModal = document.getElementById('whatsapp-modal');
  const whatsappPreviewText = document.getElementById('whatsapp-preview-text');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const confirmWhatsappBtn = document.getElementById('confirm-whatsapp-btn');
  const emailBtn = document.getElementById('email-btn');
  const downloadBtn = document.getElementById('download-btn');
  const shareBtn = document.getElementById('share-btn');

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    setupMonthSelector();
    render();
    setupEventListeners();
    // Select today by default
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    selectCalendarDay(`${yyyy}-${mm}-${dd}`);
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
    
    // Render calendar after updating the history list
    renderCalendar();
  }

  // ==========================================================================
  // CALENDAR
  // ==========================================================================
  function renderCalendar() {
    calendarGrid.innerHTML = '';
    
    // Build a set of entry types per day for the current month
    const dayMap = {}; // key: day number → Set of types
    getFilteredEntries().forEach(entry => {
      const day = parseInt(entry.date.split('-')[2], 10);
      if (!dayMap[day]) dayMap[day] = new Set();
      if (entry.type === 'hours') dayMap[day].add('hours');
      else if (entry.type === 'expenses') dayMap[day].add(entry.expenseNature === 'credit' ? 'credit' : 'expense');
      else if (entry.type === 'payments') dayMap[day].add('payment');
    });
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    // getDay(): 0=Sun,1=Mon...6=Sat. We want Mon=0, so:
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    
    // Empty cells before the 1st
    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calendarGrid.appendChild(empty);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      if (dateStr === todayStr) btn.classList.add('today');
      if (dateStr === entryDateInput.value) btn.classList.add('selected');
      
      const numEl = document.createElement('span');
      numEl.textContent = d;
      btn.appendChild(numEl);
      
      if (dayMap[d]) {
        const dotsEl = document.createElement('div');
        dotsEl.className = 'cal-dots';
        if (dayMap[d].has('hours')) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot cal-dot--hours';
          dotsEl.appendChild(dot);
        }
        if (dayMap[d].has('expense')) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot cal-dot--expense';
          dotsEl.appendChild(dot);
        }
        if (dayMap[d].has('credit')) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot cal-dot--hours';
          dotsEl.appendChild(dot);
        }
        if (dayMap[d].has('payment')) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot cal-dot--payment';
          dotsEl.appendChild(dot);
        }
        btn.appendChild(dotsEl);
      }
      
      btn.addEventListener('click', () => selectCalendarDay(dateStr));
      calendarGrid.appendChild(btn);
    }
  }
  
  function selectCalendarDay(dateStr) {
    entryDateInput.value = dateStr;
    // Update selected-date label
    const parts = dateStr.split('-');
    selectedDateLabel.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
    // Update selected class in calendar
    calendarGrid.querySelectorAll('.cal-day').forEach(btn => btn.classList.remove('selected'));
    const dayNum = parseInt(parts[2], 10);
    const allDays = calendarGrid.querySelectorAll('.cal-day:not(.empty)');
    // The day number btn is at index dayNum - 1 relative to non-empty days
    if (allDays[dayNum - 1]) allDays[dayNum - 1].classList.add('selected');
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
    
    // PDF Export Button
    pdfBtn.addEventListener('click', handlePDFExport);
    
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
    
    // Helper: trunca a descrição para garantir que cabe numa linha
    const truncate = (str, max = 18) => str.length > max ? str.slice(0, max - 1) + '…' : str;

    // Helper: formata valor compacto sem espaço antes do €
    const compactCurrency = (val) => formatCurrency(val).replace(/\s/g, '');

    // ── Movimentos: Data  Valor  Descrição (uma linha) ──
    if (chronologicalEntries.length > 0) {
      chronologicalEntries.forEach(entry => {
        const dateShort = formatDateShort(entry.date);
        
        if (entry.type === 'hours') {
          const value = Number(entry.hours) * HOURLY_RATE;
          const hoursLabel = formatHours(entry.hours).replace(' ', '');
          const desc = truncate(`Trabalho (${hoursLabel})`);
          text += `${dateShort} +${compactCurrency(value)} ${desc}\n`;
          
        } else if (entry.type === 'expenses') {
          const desc = truncate(entry.description || 'Diversos');
          if (entry.expenseNature === 'credit') {
            text += `${dateShort} +${compactCurrency(entry.amount)} ${desc}\n`;
          } else {
            text += `${dateShort} -${compactCurrency(entry.amount)} ${desc}\n`;
          }
          
        } else if (entry.type === 'payments') {
          const desc = truncate(entry.description || 'Recebido');
          text += `${dateShort} -${compactCurrency(entry.amount)} Pagam. ${desc}\n`;
        }
      });
      text += '\n';
    } else {
      text += `Sem movimentos registados este mês\n\n`;
    }
    
    // ── Rodapé ──
    text += `\n*TOTAL A RECEBER:  ${formatCurrency(netAmount)}*`;
    
    // Mostrar no Modal
    whatsappPreviewText.value = text;
    whatsappModal.classList.remove('hidden');
    
    // WhatsApp
    confirmWhatsappBtn.onclick = () => {
      const finalMessage = whatsappPreviewText.value;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(finalMessage)}`;
      window.open(whatsappUrl, '_blank');
      whatsappModal.classList.add('hidden');
    };

    // Email
    emailBtn.onclick = () => {
      const subject = encodeURIComponent(`Extrato ${MONTH_NAMES[currentMonth]} ${currentYear}`);
      const body = encodeURIComponent(whatsappPreviewText.value);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    };

    // Download .txt
    downloadBtn.onclick = () => {
      const content = whatsappPreviewText.value;
      const filename = `extrato_${MONTH_NAMES[currentMonth].toLowerCase()}_${currentYear}.txt`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    // Partilhar (menu nativo do Android/iOS)
    shareBtn.onclick = async () => {
      const content = whatsappPreviewText.value;
      const filename = `extrato_${MONTH_NAMES[currentMonth].toLowerCase()}_${currentYear}.txt`;
      if (navigator.share) {
        try {
          // Tenta partilhar como ficheiro
          const file = new File([content], filename, { type: 'text/plain' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Extrato ${MONTH_NAMES[currentMonth]} ${currentYear}` });
          } else {
            // Fallback: partilha só o texto
            await navigator.share({ title: `Extrato ${MONTH_NAMES[currentMonth]} ${currentYear}`, text: content });
          }
        } catch (err) {
          if (err.name !== 'AbortError') console.error('Erro ao partilhar:', err);
        }
      } else {
        // Fallback para browsers sem suporte: copia para clipboard
        navigator.clipboard.writeText(content).then(() => alert('Texto copiado! Cola onde quiseres.'));
      }
    };
  }

  // ==========================================================================
  // PDF EXPORT
  // ==========================================================================
  function handlePDFExport() {
    const currentMonthEntries = getFilteredEntries();
    
    const previousEntries = entries.filter(entry => {
      const d = new Date(entry.date);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() < currentMonth);
    });
    
    let prevH = 0, prevE = 0, prevP = 0;
    previousEntries.forEach(e => {
      if (e.type === 'hours') prevH += Number(e.hours) || 0;
      else if (e.type === 'expenses') { if (e.expenseNature === 'credit') prevE -= Number(e.amount) || 0; else prevE += Number(e.amount) || 0; }
      else if (e.type === 'payments') prevP += Number(e.amount) || 0;
    });
    const previousBalance = (prevH * HOURLY_RATE) - prevE - prevP;
    
    let totH = 0, totE = 0, totP = 0;
    currentMonthEntries.forEach(e => {
      if (e.type === 'hours') totH += Number(e.hours) || 0;
      else if (e.type === 'expenses') { if (e.expenseNature === 'credit') totE -= Number(e.amount) || 0; else totE += Number(e.amount) || 0; }
      else if (e.type === 'payments') totP += Number(e.amount) || 0;
    });
    const netAmount = previousBalance + (totH * HOURLY_RATE) - totE - totP;
    const sorted = [...currentMonthEntries].sort((a, b) => a.date.localeCompare(b.date));
    
    // Build table rows
    let rows = '';
    sorted.forEach(entry => {
      const d = formatDateShort(entry.date);
      let val = '', desc = '', cls = '';
      if (entry.type === 'hours') {
        val = `+${formatCurrency(Number(entry.hours) * HOURLY_RATE)}`;
        desc = `Trabalho (${formatHours(entry.hours)})`;
        cls = 'positive';
      } else if (entry.type === 'expenses') {
        if (entry.expenseNature === 'credit') {
          val = `+${formatCurrency(entry.amount)}`;
          desc = entry.description || 'Reembolso';
          cls = 'positive';
        } else {
          val = `-${formatCurrency(entry.amount)}`;
          desc = entry.description || 'Diversos';
          cls = 'negative';
        }
      } else if (entry.type === 'payments') {
        val = `-${formatCurrency(entry.amount)}`;
        desc = `Pagamento — ${entry.description || 'Recebido'}`;
        cls = 'negative';
      }
      rows += `<tr><td class="col-date">${d}</td><td class="col-val ${cls}">${val}</td><td class="col-desc">${escapeHTML(desc)}</td></tr>`;
    });
    
    const prevBalanceRow = previousBalance !== 0
      ? `<tr class="balance-row"><td colspan="3"><strong>Saldo anterior:&nbsp;&nbsp;${formatCurrency(previousBalance)}</strong></td></tr>`
      : '';
    
    const html = `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<title>Extrato ${MONTH_NAMES[currentMonth]} ${currentYear}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; padding: 32px 28px; max-width: 600px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #1a1a2e; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  .header .period { font-size: 11px; color: #555; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; padding: 6px 8px; border-bottom: 1px solid #e5e5e5; text-align: left; }
  td { padding: 10px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; line-height: 1.4; }
  .col-date { white-space: nowrap; width: 58px; color: #555; font-size: 12px; }
  .col-val { white-space: nowrap; width: 100px; font-weight: 600; font-size: 13px; }
  .col-desc { color: #333; }
  .positive { color: #16a34a; }
  .negative { color: #dc2626; }
  .balance-row td { background: #f8f8f8; font-size: 12px; color: #444; padding: 8px 8px; }
  .footer { border-top: 2px solid #1a1a2e; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; }
  .footer .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
  .footer .total { font-size: 20px; font-weight: 700; }
  .no-print { text-align: center; margin-top: 28px; }
  .no-print button { background: #1a1a2e; color: #fff; border: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  @media print { .no-print { display: none; } body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="period">Extrato Mensal</div>
      <h1>${MONTH_NAMES[currentMonth]} ${currentYear}</h1>
    </div>
    <div class="period">HourFlow</div>
  </div>
  <table>
    <thead><tr><th>Data</th><th>Valor</th><th>Descrição</th></tr></thead>
    <tbody>
      ${prevBalanceRow}
      ${rows || '<tr><td colspan="3" style="color:#aaa;text-align:center;padding:20px">Sem movimentos registados</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    <span class="label">Total a Receber</span>
    <span class="total">${formatCurrency(netAmount)}</span>
  </div>
  <div class="no-print">
    <button onclick="window.print()">Guardar como PDF / Imprimir</button>
  </div>
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => { URL.revokeObjectURL(url); };
    }
  }

  // Run the app!
  init();
});
