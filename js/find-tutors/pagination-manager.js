// ============================================
// PAGINATION MANAGEMENT MODULE
// ============================================

const PaginationManager = {
    renderPagination(currentPage, totalPages, totalTutors) {
        // Remove existing pagination
        const existingPagination = document.getElementById('paginationContainer');
        if (existingPagination) {
            existingPagination.remove();
        }

        // Always show pagination to display total count, even if just 1 page
        // if (totalPages <= 1) return;

        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationContainer';
        paginationContainer.className = 'flex justify-center items-center gap-2 mt-8 mb-16 pb-2 relative';
        paginationContainer.style.zIndex = '10';

        // Previous button - theme aware
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.style.cssText = `
        padding: 16px 32px;
        background: ${currentPage === 1 ? '#e5e7eb' : 'var(--button-bg, #F59E0B)'};
        color: ${currentPage === 1 ? '#9ca3af' : 'white'};
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.3s ease;
        opacity: ${currentPage === 1 ? '0.5' : '1'};
        cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};
    `;
        prevButton.disabled = currentPage === 1;
        if (currentPage > 1) {
            prevButton.onmouseover = () => {
                prevButton.style.transform = 'translateY(-2px)';
                prevButton.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.3)';
            };
            prevButton.onmouseout = () => {
                prevButton.style.transform = 'translateY(0)';
                prevButton.style.boxShadow = 'none';
            };
        }
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) this.changePage(currentPage - 1);
        });
        paginationContainer.appendChild(prevButton);

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Page buttons with theme styling
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            const isActive = i === currentPage;
            pageButton.style.cssText = `
            padding: 12px 18px;
            background: ${isActive ? 'var(--button-bg, #F59E0B)' : 'transparent'};
            color: ${isActive ? 'white' : 'var(--text, #374151)'};
            border: 2px solid ${isActive ? 'var(--button-bg, #F59E0B)' : 'var(--border-color, #e5e7eb)'};
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            cursor: pointer;
        `;
            if (!isActive) {
                pageButton.onmouseover = () => {
                    pageButton.style.background = 'var(--button-bg, #F59E0B)';
                    pageButton.style.color = 'white';
                    pageButton.style.transform = 'translateY(-2px)';
                };
                pageButton.onmouseout = () => {
                    pageButton.style.background = 'transparent';
                    pageButton.style.color = 'var(--text, #374151)';
                    pageButton.style.transform = 'translateY(0)';
                };
            }
            pageButton.addEventListener('click', () => this.changePage(i));
            paginationContainer.appendChild(pageButton);
        }

        // Next button - theme aware
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.style.cssText = `
        padding: 16px 32px;
        background: ${currentPage === totalPages ? '#e5e7eb' : 'var(--button-bg, #F59E0B)'};
        color: ${currentPage === totalPages ? '#9ca3af' : 'white'};
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.3s ease;
        opacity: ${currentPage === totalPages ? '0.5' : '1'};
        cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};
    `;
        nextButton.disabled = currentPage === totalPages;
        if (currentPage < totalPages) {
            nextButton.onmouseover = () => {
                nextButton.style.transform = 'translateY(-2px)';
                nextButton.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.3)';
            };
            nextButton.onmouseout = () => {
                nextButton.style.transform = 'translateY(0)';
                nextButton.style.boxShadow = 'none';
            };
        }
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) this.changePage(currentPage + 1);
        });
        paginationContainer.appendChild(nextButton);

        // Info text
        const infoSpan = document.createElement('span');
        infoSpan.className = 'ml-4';
        infoSpan.style.color = 'var(--text, #6b7280)';
        infoSpan.textContent = `Page ${currentPage} of ${totalPages} (${totalTutors} tutors)`;
        paginationContainer.appendChild(infoSpan);

        const tutorCardsElement = document.getElementById('tutorCards');
        if (tutorCardsElement && tutorCardsElement.parentNode) {
            tutorCardsElement.parentNode.insertBefore(paginationContainer, tutorCardsElement.nextSibling);
        }
    },

    changePage(page) {
        // This would typically call the main controller or state management
        if (typeof FindTutorsController !== 'undefined' && FindTutorsController.loadTutors) {
            FindTutorsState.currentPage = page;
            FindTutorsController.loadTutors();
        } else {
            // Fallback for global function
            if (typeof changePage !== 'undefined') {
                changePage(page);
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};