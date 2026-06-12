// ============================================
//   PARTNERS
// ============================================

// Use global API base URL
const partnerApiUrl = window.API_BASE_URL || 'http://localhost:8000';

async function fetchPartnersFromAPI() {
    try {
        // Homepage shows only admin-featured partners.
        const response = await fetch(`${partnerApiUrl}/api/partners?featured_only=true`);
        if (response.ok) {
            const data = await response.json();
            if (data.partners && data.partners.length > 0) {
                return data.partners;
            }
        }
    } catch (error) {
        console.log('No partners available');
    }
    return null;
}

async function initializePartners() {
    const track = document.getElementById("partners-track");
    if (!track) return;

    const header = document.getElementById("partners-header");
    const wrapper = document.getElementById("partners-wrapper");

    // Only admin-approved partners are shown. With none, keep the logos area
    // hidden (the "Become a Partner" CTA still renders) — no placeholder logos.
    const partners = await fetchPartnersFromAPI();
    if (!partners || partners.length === 0) {
        if (header) header.style.display = "none";
        if (wrapper) wrapper.style.display = "none";
        return;
    }

    if (header) header.style.display = "";
    if (wrapper) wrapper.style.display = "";
    track.innerHTML = "";

    const createPartnerCard = (partner) => {
        const card = document.createElement("div");
        card.className = "partner-logo";
        const logo = partner.logo || partner.logo_url || '';
        card.innerHTML = `
            ${logo ? `<img src="${logo}" alt="${partner.name}" loading="lazy" />` : ''}
            <div class="partner-name">${partner.name}</div>
        `;
        card.title = partner.description || partner.name;
        return card;
    };

    // Add partners twice for the infinite-scroll marquee effect.
    partners.forEach((partner) => track.appendChild(createPartnerCard(partner)));
    partners.forEach((partner) => track.appendChild(createPartnerCard(partner)));
}

// ============================================
//   PARTNER FORM HANDLING
// ============================================

// Add email field
window.addEmailField = function() {
    const container = document.getElementById('emails-container');
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className = 'email-field-wrapper';
    fieldWrapper.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';

    fieldWrapper.innerHTML = `
        <input type="email" class="partner-email" placeholder="email@company.com" style="flex: 1;">
        <button type="button" onclick="removeField(this)" class="remove-field-btn" title="Remove">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    container.appendChild(fieldWrapper);
};

// Add phone field
window.addPhoneField = function() {
    const container = document.getElementById('phones-container');
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className = 'phone-field-wrapper';
    fieldWrapper.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';

    fieldWrapper.innerHTML = `
        <input type="tel" class="partner-phone" placeholder="+251 912 345 678" style="flex: 1;">
        <button type="button" onclick="removeField(this)" class="remove-field-btn" title="Remove">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    container.appendChild(fieldWrapper);
};

// Remove field (email or phone)
window.removeField = function(button) {
    const wrapper = button.parentElement;
    wrapper.remove();
};

// Toggle applicant naming system (Ethiopian vs International)
window.togglePartnerNaming = function() {
    const intl = document.getElementById('partnerNamingInternational')?.checked;
    const eth = document.getElementById('partner-ethiopian-names');
    const intlEl = document.getElementById('partner-international-names');
    if (eth) eth.style.display = intl ? 'none' : '';
    if (intlEl) intlEl.style.display = intl ? '' : 'none';
};

// Toggle "Other" partnership type text field
window.toggleOtherPartnerType = function(value) {
    const otherContainer = document.getElementById('other-partner-type-container');
    const otherInput = document.getElementById('other-partner-type');

    if (value === 'other') {
        otherContainer.style.display = 'block';
        otherInput.required = true;
    } else {
        otherContainer.style.display = 'none';
        otherInput.required = false;
        otherInput.value = ''; // Clear the field when hidden
    }
};

// Close partner success modal
window.closePartnerSuccessModal = function() {
    closeModal('partner-success-modal');
    // Reset the partner form
    document.getElementById('partner-form').reset();

    // Reset email and phone containers to single field
    const emailsContainer = document.getElementById('emails-container');
    emailsContainer.innerHTML = `
        <div class="email-field-wrapper" style="display: flex; gap: 8px; margin-bottom: 8px;">
            <input type="email" class="partner-email" placeholder="email@company.com" required style="flex: 1;">
        </div>
    `;

    const phonesContainer = document.getElementById('phones-container');
    phonesContainer.innerHTML = `
        <div class="phone-field-wrapper" style="display: flex; gap: 8px; margin-bottom: 8px;">
            <input type="tel" class="partner-phone" placeholder="+251 912 345 678" required style="flex: 1;">
        </div>
    `;

    // Hide the "Other" partnership type field
    const otherContainer = document.getElementById('other-partner-type-container');
    const otherInput = document.getElementById('other-partner-type');
    if (otherContainer) {
        otherContainer.style.display = 'none';
        otherInput.required = false;
        otherInput.value = '';
    }
};

// Handle partner form submission
document.addEventListener('DOMContentLoaded', () => {
    const partnerForm = document.getElementById('partner-form');
    if (partnerForm) {
        partnerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Collect all emails
            const emailInputs = document.querySelectorAll('.partner-email');
            const emails = Array.from(emailInputs)
                .map(input => input.value.trim())
                .filter(email => email !== '');

            // Collect all phones
            const phoneInputs = document.querySelectorAll('.partner-phone');
            const phones = Array.from(phoneInputs)
                .map(input => input.value.trim())
                .filter(phone => phone !== '');

            // Get other form data
            const companyName = document.getElementById('partner-company').value.trim();
            const contactPerson = document.getElementById('partner-contact').value.trim();
            const partnershipType = document.getElementById('partner-type').value;
            const otherPartnerType = document.getElementById('other-partner-type').value.trim();
            const description = document.getElementById('partner-description').value.trim();
            const proposalFile = document.getElementById('partner-proposal').files[0];
            const logoFile = document.getElementById('partner-logo').files[0];
            const ownershipFile = document.getElementById('partner-ownership-proof').files[0];
            const website = document.getElementById('partner-website').value.trim();
            const socialLink = document.getElementById('partner-social').value.trim();
            const personalEmail = document.getElementById('partner-personal-email').value.trim();
            const dob = document.getElementById('partner-dob').value;

            // Applicant identity by naming system
            const isIntl = document.getElementById('partnerNamingInternational')?.checked;
            const namingSystem = isIntl ? 'international' : 'ethiopian';
            const firstName = (isIntl
                ? document.getElementById('partner-first-name-intl')
                : document.getElementById('partner-first-name')).value.trim();
            const fatherName = document.getElementById('partner-father-name').value.trim();
            const grandfatherName = document.getElementById('partner-grandfather-name').value.trim();
            const lastName = document.getElementById('partner-last-name').value.trim();

            // Validation
            if (!contactPerson || emails.length === 0 || phones.length === 0 || !partnershipType) {
                alert('Please fill in all required fields'); return;
            }
            if (partnershipType === 'other' && !otherPartnerType) {
                alert('Please specify your partnership type'); return;
            }
            if (!logoFile) { alert('Please upload your logo'); return; }
            if (!ownershipFile) { alert('Please upload business ownership proof'); return; }
            if (!proposalFile) { alert('Please upload a proposal file'); return; }
            if (!personalEmail) { alert('Please provide a personal email'); return; }
            if (!firstName) { alert('Please enter the applicant first name'); return; }
            if (isIntl ? !lastName : (!fatherName || !grandfatherName)) {
                alert('Please complete the applicant name fields'); return;
            }
            if (!website && !socialLink) {
                if (!confirm('No website or social media link provided. Submit anyway?')) return;
            }
            for (const [f, label] of [[logoFile,'Logo'],[ownershipFile,'Ownership proof'],[proposalFile,'Proposal']]) {
                if (f.size > 10 * 1024 * 1024) { alert(`${label} must be under 10MB`); return; }
            }

            const finalPartnershipType = partnershipType === 'other' ? otherPartnerType : partnershipType;

            const formData = new FormData();
            formData.append('company_name', companyName);
            formData.append('contact_person', contactPerson);
            formData.append('emails', JSON.stringify(emails));
            formData.append('phones', JSON.stringify(phones));
            formData.append('partnership_type', finalPartnershipType);
            formData.append('partnership_type_category', partnershipType);
            formData.append('description', description);
            formData.append('website', website);
            formData.append('social_link', socialLink);
            formData.append('naming_system', namingSystem);
            formData.append('applicant_first_name', firstName);
            formData.append('applicant_father_name', fatherName);
            formData.append('applicant_grandfather_name', grandfatherName);
            formData.append('applicant_last_name', lastName);
            formData.append('date_of_birth', dob || '');
            formData.append('personal_email', personalEmail);
            formData.append('logo', logoFile);
            formData.append('ownership_proof', ownershipFile);
            formData.append('proposal', proposalFile);

            const submitBtn = partnerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            try {
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;

                const response = await fetch(`${partnerApiUrl}/api/partner-requests`, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (response.ok) {
                    closeModal('partner-modal');
                    // Launch identity KYC against the new application id.
                    if (window.PartnerKYC && result.request_id) {
                        window.PartnerKYC.start(result.request_id, () => {
                            showPartnerSuccess(companyName, emails, phones);
                        });
                    } else {
                        showPartnerSuccess(companyName, emails, phones);
                    }
                } else {
                    alert(result.detail || result.error || 'Failed to submit partnership request. Please try again.');
                }
            } catch (error) {
                console.error('Error submitting partnership request:', error);
                alert('An error occurred while submitting your request. Please try again.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// Show the success modal (shared between the KYC-complete and skip paths).
function showPartnerSuccess(companyName, emails, phones) {
    const successTitle = document.getElementById('partner-success-title');
    if (successTitle) successTitle.textContent = `Thank You${companyName ? ', ' + companyName : ''}!`;
    const contactsDiv = document.getElementById('partner-success-contacts');
    if (contactsDiv) {
        contactsDiv.innerHTML = `
            <div style="margin-bottom: 12px;">
                <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">📧 Email(s):</strong>
                ${emails.map(e => `<div style="color: var(--text-secondary); padding: 4px 0;">• ${e}</div>`).join('')}
            </div>
            <div>
                <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">📱 Phone(s):</strong>
                ${phones.map(p => `<div style="color: var(--text-secondary); padding: 4px 0;">• ${p}</div>`).join('')}
            </div>`;
    }
    if (typeof openModal === 'function') openModal('partner-success-modal');
}
window.showPartnerSuccess = showPartnerSuccess;

// ============================================
//   PARTNER IDENTITY KYC (post-application)
//   Captures an ID photo + a selfie via the device camera and posts them to
//   /api/partner-kyc/{id}/*. Applicants may skip; admins review either way.
// ============================================
window.PartnerKYC = (function () {
    const apiBase = () => (window.API_BASE_URL || 'http://localhost:8000');
    let stream = null;

    function ensureModal() {
        let modal = document.getElementById('partner-kyc-modal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'partner-kyc-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:3000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);padding:1rem;';
        modal.innerHTML = `
          <div style="background:var(--card-background,#fff);border-radius:14px;max-width:460px;width:100%;padding:1.5rem;text-align:center;">
            <h3 id="pk-title" style="margin:0 0 .25rem;font-size:1.25rem;font-weight:700;">Identity Check</h3>
            <p id="pk-step" style="margin:0 0 1rem;color:var(--text-secondary,#6b7280);font-size:.9rem;">Step 1 of 2: Photo of your ID</p>
            <video id="pk-video" autoplay playsinline muted style="width:100%;border-radius:10px;background:#000;aspect-ratio:4/3;object-fit:cover;"></video>
            <canvas id="pk-canvas" style="display:none;"></canvas>
            <div style="margin-top:1rem;display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;">
              <button id="pk-capture" class="submit-btn" style="min-width:140px;">Capture</button>
              <button id="pk-skip" style="background:transparent;border:1px solid var(--border-color,#d1d5db);border-radius:8px;padding:.5rem .9rem;cursor:pointer;">Skip for now</button>
            </div>
            <p id="pk-msg" style="margin-top:.75rem;font-size:.8rem;min-height:1em;color:var(--text-secondary,#6b7280);"></p>
          </div>`;
        document.body.appendChild(modal);
        return modal;
    }

    async function openCamera() {
        const video = document.getElementById('pk-video');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        video.srcObject = stream;
    }

    function stopCamera() {
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    }

    function snapshot() {
        const video = document.getElementById('pk-video');
        const canvas = document.getElementById('pk-canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
    }

    async function postForm(url, payload) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
        const res = await fetch(`${apiBase()}${url}`, { method: 'POST', body: fd });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.detail || `HTTP ${res.status}`);
        }
        return res.json();
    }

    function close(done) {
        stopCamera();
        const modal = document.getElementById('partner-kyc-modal');
        if (modal) modal.style.display = 'none';
        if (typeof done === 'function') done();
    }

    async function start(requestId, done) {
        const modal = ensureModal();
        modal.style.display = 'flex';
        const title = document.getElementById('pk-title');
        const stepEl = document.getElementById('pk-step');
        const msg = document.getElementById('pk-msg');
        const captureBtn = document.getElementById('pk-capture');
        const skipBtn = document.getElementById('pk-skip');
        let step = 'document';

        try { await openCamera(); }
        catch (e) {
            msg.textContent = 'Camera unavailable. You can skip and our team will verify manually.';
        }

        skipBtn.onclick = () => close(done);

        captureBtn.onclick = async () => {
            captureBtn.disabled = true;
            msg.textContent = 'Uploading…';
            try {
                const image = snapshot();
                if (step === 'document') {
                    await postForm(`/api/partner-kyc/${requestId}/upload-document`, { image });
                    step = 'selfie';
                    title.textContent = 'Identity Check';
                    stepEl.textContent = 'Step 2 of 2: Take a selfie';
                    msg.textContent = 'ID captured. Now take a selfie.';
                } else {
                    await postForm(`/api/partner-kyc/${requestId}/upload-selfie`, { image });
                    msg.textContent = 'Verification submitted. Thank you!';
                    setTimeout(() => close(done), 800);
                }
            } catch (err) {
                msg.textContent = 'Could not verify: ' + err.message + ' — you may skip.';
            } finally {
                captureBtn.disabled = false;
            }
        };
    }

    return { start };
})();
