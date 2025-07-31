
    // Sorting, filtering, and search functionality
    const searchBar = document.getElementById('searchBar');
    const confirmedFilter = document.getElementById('confirmedFilter');
    const sortSchoolAsc = document.getElementById('sortSchoolAsc');
    const sortRatingAsc = document.getElementById('sortRatingAsc');
    const tutorList = document.getElementById('tutorList');
    const tutorCards = Array.from(document.querySelectorAll('.tutor-card'));

    function applyFiltersAndSort() {
      const searchTerm = searchBar.value.toLowerCase();
      const sortByConfirmed = confirmedFilter.checked;
      const schoolAsc = sortSchoolAsc.checked;
      const ratingAsc = sortRatingAsc.checked;

      // Filter tutors by search term (name, school, or tutor phone)
      let filteredTutors = tutorCards.filter(card => {
        const name = card.getAttribute('data-name').toLowerCase();
        const school = card.getAttribute('data-school').toLowerCase();
        const phone = card.getAttribute('data-phone').toLowerCase();
        return name.includes(searchTerm) || school.includes(searchTerm) || phone.includes(searchTerm);
      });

      // Sort tutors
      filteredTutors.sort((a, b) => {
        const statusA = a.getAttribute('data-status');
        const statusB = b.getAttribute('data-status');
        // 1. Primary sort: confirmation status
        if (statusA !== statusB) {
          return sortByConfirmed
            ? statusA === 'Confirmed' ? -1 : 1
            : statusA === 'Pending' ? -1 : 1;
        }
        // 2. Secondary sort: school name
        const schoolA = a.getAttribute('data-school');
        const schoolB = b.getAttribute('data-school');
        if (schoolAsc !== undefined && schoolA !== schoolB) {
          return schoolAsc ? schoolA.localeCompare(schoolB) : schoolB.localeCompare(schoolA);
        }
        // 3. Tertiary sort: school rating
        if (ratingAsc !== undefined) {
          const ratingA = parseFloat(a.getAttribute('data-rating'));
          const ratingB = parseFloat(b.getAttribute('data-rating'));
          if (ratingA !== ratingB) {
            return ratingAsc ? ratingA - ratingB : ratingB - rating1B;
          }
        }
        return 0; // Stable sort if all criteria are equal
      });

      // Clear and re-append sorted tutors
      tutorList.innerHTML = '';
      filteredTutors.forEach(card => {
        tutorList.appendChild(card);
        card.style.display = 'grid';
      });
      // Hide non-matching tutors
      tutorCards.forEach(card => {
        if (!filteredTutors.includes(card)) {
          card.style.display = 'none';
        }
      });
    }

    searchBar.addEventListener('input', applyFiltersAndSort);
    confirmedFilter.addEventListener('change', applyFiltersAndSort);
    sortSchoolAsc.addEventListener('change', applyFiltersAndSort);
    sortRatingAsc.addEventListener('change', applyFiltersAndSort);

    // Confirm and Deny button functionality
    document.querySelectorAll('.confirm-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const card = e.target.closest('.tutor-card');
        card.querySelector('.status-info p').textContent = 'Status: Confirmed';
        card.setAttribute('data-status', 'Confirmed');
        e.target.disabled = true;
        e.target.classList.add('bg-gray-400');
        e.target.classList.remove('bg-green-500', 'hover:bg-green-600');
        card.querySelector('.deny-btn').disabled = true;
        card.querySelector('.deny-btn').classList.add('bg-gray-400');
        card.querySelector('.deny-btn').classList.remove('bg-red-500', 'hover:bg-red-600');
        console.log(`Confirmed tutor: ${card.querySelector('.tutor-details h3').textContent}`);
        applyFiltersAndSort(); // Re-apply filters and sort after status change
      });
    });

    document.querySelectorAll('.deny-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const card = e.target.closest('.tutor-card');
        card.remove();
        console.log(`Denied tutor: ${card.querySelector('.tutor-details h3').textContent}`);
        applyFiltersAndSort(); // Re-apply filters and sort after removal
      });
    });

    // Initial sort and filter
    applyFiltersAndSort();