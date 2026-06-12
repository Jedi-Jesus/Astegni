
// ============================================
//   TESTIMONIALS (real user reviews of Astegni)
//   Renders the reviews an admin featured via the Manage Astegni page.
//   Source: GET /api/featured-reviews. Section stays hidden when empty.
// ============================================
async function initializeTestimonials() {
    const section = document.getElementById("testimonials-section");
    const slider = document.getElementById("testimonials-slider");
    if (!slider) return;

    const base = window.API_BASE_URL || 'http://localhost:8000';
    let reviews = [];
    try {
        const res = await fetch(`${base}/api/featured-reviews?limit=12`);
        if (res.ok) {
            const data = await res.json();
            reviews = data.reviews || [];
        }
    } catch (e) {
        console.log('No featured testimonials available');
    }

    // No featured user reviews -> keep the section hidden entirely.
    if (reviews.length === 0) {
        if (section) section.style.display = "none";
        return;
    }
    if (section) section.style.display = "";

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
    const roleLabel = (r) => r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Astegni User';

    let currentSet = 0;
    const perPage = 3;
    const pages = Math.ceil(reviews.length / perPage);

    function render() {
        slider.innerHTML = "";
        const start = currentSet * perPage;
        // Show up to `perPage` cards for this page (last page may have fewer).
        const starStr = (n) => '⭐'.repeat(Math.max(1, Math.min(5, Math.round(n || 0))));
        for (let i = 0; i < perPage && (start + i) < reviews.length; i++) {
            const t = reviews[start + i];
            // Two distinct stars:
            //  - tutor's OWN rating (received as a tutor) shows just under the name;
            //    only for tutors (tutor_rating != null).
            //  - astegni rating (the stars they gave Astegni) shows after the review.
            const astegniStars = starStr(t.astegni_rating != null ? t.astegni_rating : t.rating);
            const hasTutorStar = (t.tutor_rating != null && t.tutor_rating > 0);
            const tutorStars = hasTutorStar
                ? `<div class="rating tutor-rating" title="Tutor's own rating from students">
                       ${starStr(t.tutor_rating)} <span class="rating-value">${t.tutor_rating.toFixed(1)}</span>
                   </div>`
                : '';
            const card = document.createElement("div");
            card.className = "testimonial-card active";
            card.innerHTML = `
                <div class="testimonial-content">
                    <div class="testimonial-author" style="margin-bottom:0.75rem;">
                        <img src="${esc(t.profile_picture)}" alt="${esc(t.name)}" class="author-avatar" loading="lazy">
                        <div class="author-info">
                            <h4>${esc(t.name)}</h4>
                            <p>${esc(roleLabel(t.role))}</p>
                            ${tutorStars}
                        </div>
                    </div>
                    <p class="testimonial-text">${esc(t.review_text)}</p>
                    <div class="rating astegni-rating" title="Rating given to Astegni">${astegniStars}</div>
                </div>
            `;
            slider.appendChild(card);
        }

        setTimeout(() => {
            document.querySelectorAll(".testimonial-card").forEach((card, index) => {
                card.style.animationDelay = `${index * 0.3}s`;
            });
        }, 100);
    }

    render();

    // Rotate pages every 9s (only if there's more than one page).
    if (pages > 1) {
        setInterval(() => {
            currentSet = (currentSet + 1) % pages;
            render();
        }, 9000);
    }
}
