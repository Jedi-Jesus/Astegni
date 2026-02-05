// ============================================
//   PARTNERS
// ============================================

// Use global API base URL
const partnerApiUrl = window.API_BASE_URL || 'http://localhost:8000';

// Default partners data
const defaultPartners = [
    {
        name: "Addis Ababa University",
        logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Addis_Ababa_University_logo.png/150px-Addis_Ababa_University_logo.png",
        description: "Leading Ethiopian University"
    },
    {
        name: "Ministry of Education",
        logo: "https://ui-avatars.com/api/?name=MoE&background=f59e0b&color=fff&size=150",
        description: "Ethiopian Ministry of Education"
    },
    {
        name: "Ethiopian Institute of Technology",
        logo: "https://ui-avatars.com/api/?name=EIT&background=3b82f6&color=fff&size=150",
        description: "Technology Institute"
    },
    {
        name: "Jimma University",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Jimma_University_logo.png/150px-Jimma_University_logo.png",
        description: "Ethiopian University"
    },
    {
        name: "Bahir Dar University",
        logo: "https://ui-avatars.com/api/?name=BDU&background=10b981&color=fff&size=150",
        description: "Ethiopian University"
    },
    {
        name: "Hawassa University",
        logo: "https://ui-avatars.com/api/?name=HU&background=8b5cf6&color=fff&size=150",
        description: "Ethiopian University"
    }
];

async function fetchPartnersFromAPI() {
    try {
        const response = await fetch(`${partnerApiUrl}/api/partners`);
        if (response.ok) {
            const data = await response.json();
            if (data.partners && data.partners.length > 0) {
                return data.partners;
            }
        }
    } catch (error) {
        console.log('Using fallback partners data');
    }
    return null;
}

async function initializePartners() {
    const track = document.getElementById("partners-track");
    if (!track) return;

    // Try to fetch from API first
    const apiPartners = await fetchPartnersFromAPI();
    const partners = apiPartners || defaultPartners;

    track.innerHTML = "";

    // Create partner cards with logos
    const createPartnerCard = (partner) => {
        const card = document.createElement("div");
        card.className = "partner-logo";
        card.innerHTML = `
            <img src="${partner.logo}" alt="${partner.name}" loading="lazy" />
            <div class="partner-name">${partner.name}</div>
        `;
        card.title = partner.description || partner.name;
        return card;
    };

    // Add partners twice for infinite scroll effect
    partners.forEach((partner) => {
        track.appendChild(createPartnerCard(partner));
    });

    partners.forEach((partner) => {
        track.appendChild(createPartnerCard(partner));
    });
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

            // Validate required fields (company name and description are now optional)
            if (!contactPerson || emails.length === 0 || phones.length === 0 || !partnershipType) {
                alert('Please fill in all required fields');
                return;
            }

            // If "Other" is selected, make sure they specified the type
            if (partnershipType === 'other' && !otherPartnerType) {
                alert('Please specify your partnership type');
                return;
            }

            // Validate proposal file is uploaded
            if (!proposalFile) {
                alert('Please upload a proposal file');
                return;
            }

            // Determine the final partnership type value
            const finalPartnershipType = partnershipType === 'other' ? otherPartnerType : partnershipType;

            // Check file size (10MB max) before submission
            if (proposalFile.size > 10 * 1024 * 1024) {
                alert('Proposal file size must be less than 10MB');
                return;
            }

            // Prepare FormData for file upload
            const formData = new FormData();
            formData.append('company_name', companyName);
            formData.append('contact_person', contactPerson);
            formData.append('emails', JSON.stringify(emails));
            formData.append('phones', JSON.stringify(phones));
            formData.append('partnership_type', finalPartnershipType);
            formData.append('partnership_type_category', partnershipType); // Store original selection
            formData.append('description', description);
            formData.append('proposal', proposalFile);

            try {
                // Show loading state
                const submitBtn = partnerForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;

                // Submit to API
                const response = await fetch(`${partnerApiUrl}/api/partner-requests`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    // Close partner modal
                    closeModal('partner-modal');

                    // Show success modal with company name and contacts
                    const successTitle = document.getElementById('partner-success-title');
                    successTitle.textContent = `Thank You, ${companyName}!`;

                    const contactsDiv = document.getElementById('partner-success-contacts');
                    contactsDiv.innerHTML = `
                        <div style="margin-bottom: 12px;">
                            <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">📧 Email(s):</strong>
                            ${emails.map(email => `<div style="color: var(--text-secondary); padding: 4px 0;">• ${email}</div>`).join('')}
                        </div>
                        <div>
                            <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">📱 Phone(s):</strong>
                            ${phones.map(phone => `<div style="color: var(--text-secondary); padding: 4px 0;">• ${phone}</div>`).join('')}
                        </div>
                    `;

                    openModal('partner-success-modal');
                } else {
                    alert(result.error || 'Failed to submit partnership request. Please try again.');
                }

                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;

            } catch (error) {
                console.error('Error submitting partnership request:', error);
                alert('An error occurred while submitting your request. Please try again.');

                // Reset button
                const submitBtn = partnerForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Submit Partnership Request';
                submitBtn.disabled = false;
            }
        });
    }
});
