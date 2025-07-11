/* Calendar application with SharePoint integration */
document.addEventListener('DOMContentLoaded', () => {
  const calendar = document.getElementById('calendar');
  const monthYear = document.getElementById('month-year');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  
  let currentDate = new Date();

  /* SharePoint REST API integration - fetches events by month/year */
  async function fetchEvents(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    try {
      const response = await $.ajax({
        url: `https://yoursharepointsite/_api/web/lists/getbytitle('Events')/items?$filter=Month eq ${month} and Year eq ${year}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=verbose'
        }
      });

      return response.d.results.map(event => ({
        Title: event.Title,
        Description: event.Description,
        EventDate: new Date(event.EventDate),
        Time: new Date(event.EventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  /* Calendar grid generation with event integration */
  function renderCalendar(date) {
    calendar.innerHTML = '';
    const year = date.getFullYear();
    const month = date.getMonth();
    
    monthYear.innerText = `${date.toLocaleString('default', { month: 'long' })} ${year}`;
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayIndex = firstDayOfMonth.getDay();
    const lastDayIndex = lastDayOfMonth.getDay();
    const prevLastDay = new Date(year, month, 0).getDate();
    
    // Fetch events for the current month and year
    fetchEvents(date).then(events => {
      // Add previous month's days
      for (let i = 0; i < firstDayIndex; i++) {
        const day = document.createElement('div');
        day.classList.add('day', 'past-day');
        day.innerText = prevLastDay - firstDayIndex + i + 1;
        calendar.appendChild(day);
      }
      
      // Add current month's days
      for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
        const day = document.createElement('div');
        day.classList.add('day');
        if (i === date.getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) {
          day.classList.add('current-day');
        }

        // Static event details
        let staticEventDetailsHtml = '';
        if (Math.random() < 0.3) {
          staticEventDetailsHtml = `
            <strong>Event Title ${i} - 1</strong><br>
            ${i}:00 AM<br>
            <em>Description of event ${i} - 1</em><br><br>
            <strong>Event Title ${i} - 2</strong><br>
            ${i}:00 PM<br>
            <em>Description of event ${i} - 2</em>
          `;
        }

        // Combine static and dynamic event details
        const dayEvents = events.filter(event => new Date(event.EventDate).getDate() === i);
        let eventDetailsHtml = staticEventDetailsHtml;
        dayEvents.forEach(event => {
          eventDetailsHtml += `
            <strong>${event.Title}</strong><br>
            ${event.Time}<br>
            <em>${event.Description}</em><br><br>
          `;
        });

        if (dayEvents.length > 0 || staticEventDetailsHtml) {
          day.classList.add('has-event');
          day.innerHTML = `<div>${i}</div>
            <div class="event-details">${eventDetailsHtml}</div>`;
        } else {
          day.innerHTML = `<div>${i}</div>`;
        }
        calendar.appendChild(day);
      }
      
      // Add next month's days
      for (let i = 1; i < 7 - lastDayIndex; i++) {
        const day = document.createElement('div');
        day.classList.add('day', 'past-day');
        day.innerText = i;
        calendar.appendChild(day);
      }
    });
  }
  
  /* Month navigation handlers */
  prev.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  });
  
  next.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  });
  
  /* Initialize calendar with current month */
  renderCalendar(currentDate);
});