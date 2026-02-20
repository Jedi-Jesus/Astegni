/**
 * ═══════════════════════════════════════════════════════════
 * COURSE REQUEST MANAGER
 * Handles the course request modal functionality
 * ═══════════════════════════════════════════════════════════
 */

// Use existing API_BASE_URL if available, otherwise define it
const COURSE_REQUEST_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : (window.API_BASE_URL || 'http://localhost:8000');

// State for course request
let courseRequestLanguages = [];
let courseRequestLessonTitles = [];
let courseRequestTags = [];

/**
 * Primary languages spoken per country (ISO 3166-1 alpha-2 → language names).
 * English is always appended as a universal suggestion if not already present.
 */
const COUNTRY_TO_LANGUAGES = {
    // ── East Africa ──────────────────────────────────────────────
    ET: ['Amharic', 'Oromo', 'Tigrinya', 'Somali', 'Sidama', 'Afar'],
    ER: ['Tigrinya', 'Arabic', 'Tigre', 'Afar'],
    DJ: ['Somali', 'Afar', 'Arabic', 'French'],
    SO: ['Somali', 'Arabic'],
    KE: ['Swahili', 'Kikuyu', 'Luo', 'Kamba', 'Luhya'],
    TZ: ['Swahili', 'Sukuma', 'Chaga', 'Nyamwezi'],
    UG: ['Luganda', 'Swahili', 'Acholi', 'Luo', 'Lugbara'],
    RW: ['Kinyarwanda', 'French', 'Swahili'],
    BI: ['Kirundi', 'French', 'Swahili'],
    SS: ['Dinka', 'Nuer', 'Zande', 'Bari', 'Arabic'],
    SD: ['Arabic', 'Nubian', 'Beja', 'Fur'],

    // ── North Africa ─────────────────────────────────────────────
    EG: ['Arabic', 'Masri'],
    MA: ['Arabic', 'Tamazight', 'Darija', 'French'],
    DZ: ['Arabic', 'Tamazight', 'Darija', 'French'],
    TN: ['Arabic', 'Tunisian Arabic', 'Tamazight', 'French'],
    LY: ['Arabic', 'Tamazight'],
    // MR (Mauritania) — merged from both West Africa and North Africa sections
    MR: ['Hassaniya Arabic', 'Wolof', 'Soninke', 'Pulaar', 'French'],

    // ── West Africa ──────────────────────────────────────────────
    NG: ['Hausa', 'Yoruba', 'Igbo', 'Fulani', 'Ijaw', 'Kanuri', 'Tiv'],
    GH: ['Twi', 'Ewe', 'Ga', 'Hausa', 'Dagbani'],
    SN: ['Wolof', 'Pulaar', 'Serer', 'Mandinka', 'French'],
    CI: ['Dioula', 'Baoulé', 'Bété', 'Sénoufo', 'French'],
    CM: ['French', 'Fulfulde', 'Ewondo', 'Hausa', 'Bassa'],
    ML: ['Bambara', 'Fulfulde', 'Soninke', 'Tamasheq', 'French'],
    BF: ['Mossi', 'Dyula', 'Fulfuldé', 'Gurma', 'French'],
    NE: ['Hausa', 'Zarma', 'Tamasheq', 'Fulfulde', 'French'],
    GN: ['Pular', 'Mandinka', 'Susu', 'Kpelle', 'French'],
    TG: ['Ewe', 'Kabiyé', 'Tem', 'French'],
    BJ: ['Fon', 'Yoruba', 'Bariba', 'Dendi', 'French'],
    SL: ['Mende', 'Temne', 'Limba', 'Krio'],
    LR: ['Kpelle', 'Bassa', 'Grebo', 'Kru'],
    GM: ['Mandinka', 'Wolof', 'Pulaar', 'Jola'],
    GW: ['Crioulo', 'Balanta', 'Fulani', 'Mandinka', 'Portuguese'],
    CV: ['Cape Verdean Creole', 'Portuguese'],

    // ── Central Africa ───────────────────────────────────────────
    CD: ['Lingala', 'Swahili', 'Tshiluba', 'Kikongo', 'French'],
    CG: ['Lingala', 'Kituba', 'Monokutuba', 'French'],
    CF: ['Sango', 'Gbaya', 'Banda', 'French'],
    TD: ['Arabic', 'Sara', 'Kanuri', 'Maba', 'French'],
    GA: ['French', 'Fang', 'Myene', 'Nzebi'],
    GQ: ['Spanish', 'French', 'Fang', 'Bubi', 'Ndowe'],

    // ── Southern Africa ──────────────────────────────────────────
    ZA: ['Zulu', 'Xhosa', 'Afrikaans', 'Sotho', 'Tswana', 'Tsonga', 'Venda', 'Ndebele'],
    ZW: ['Shona', 'Ndebele', 'Chewa', 'Nambya'],
    ZM: ['Bemba', 'Nyanja', 'Tonga', 'Lozi', 'Kaonde'],
    MW: ['Chichewa', 'Tumbuka', 'Yao', 'Lomwe'],
    MZ: ['Makhuwa', 'Tsonga', 'Sena', 'Ndau', 'Portuguese'],
    BW: ['Tswana', 'Kalanga', 'Afrikaans', 'Kgalagadi'],
    NA: ['Oshiwambo', 'Afrikaans', 'Otjiherero', 'Damara/Nama'],
    SZ: ['Swati', 'Zulu'],
    LS: ['Sotho', 'Zulu'],
    AO: ['Umbundu', 'Kimbundu', 'Kikongo', 'Chokwe', 'Portuguese'],
    MG: ['Malagasy', 'French'],
    MU: ['Mauritian Creole', 'French', 'Bhojpuri'],
    SC: ['Seychellois Creole', 'French'],
    KM: ['Comorian', 'Arabic', 'French'],
    ST: ['Portuguese', 'Forro', 'Angolar'],

    // ── Middle East ──────────────────────────────────────────────
    SA: ['Arabic'],
    AE: ['Arabic'],
    IQ: ['Arabic', 'Kurdish', 'Neo-Aramaic'],
    IR: ['Persian', 'Azerbaijani', 'Kurdish', 'Gilaki', 'Mazanderani'],
    TR: ['Turkish', 'Kurdish', 'Zaza'],
    IL: ['Hebrew', 'Arabic'],
    JO: ['Arabic'],
    LB: ['Arabic', 'French'],
    SY: ['Arabic', 'Kurdish', 'Neo-Aramaic'],
    YE: ['Arabic', 'Socotri'],
    OM: ['Arabic', 'Baluchi', 'Swahili'],
    KW: ['Arabic'],
    QA: ['Arabic'],
    BH: ['Arabic'],
    PS: ['Arabic'],

    // ── South Asia ───────────────────────────────────────────────
    IN: ['Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Assamese'],
    PK: ['Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi', 'Saraiki'],
    BD: ['Bengali', 'Chittagonian', 'Sylheti'],
    LK: ['Sinhala', 'Tamil'],
    NP: ['Nepali', 'Maithili', 'Bhojpuri', 'Tharu', 'Tamang'],
    AF: ['Pashto', 'Dari', 'Uzbek', 'Turkmen'],
    MV: ['Dhivehi'],
    BT: ['Dzongkha', 'Nepali', 'Tshangla'],

    // ── Southeast Asia ───────────────────────────────────────────
    ID: ['Indonesian', 'Javanese', 'Sundanese', 'Madurese', 'Minangkabau', 'Batak'],
    PH: ['Filipino', 'Cebuano', 'Ilocano', 'Waray', 'Hiligaynon', 'Kapampangan'],
    VN: ['Vietnamese', 'Tay', 'Muong', 'Khmer'],
    TH: ['Thai', 'Isan', 'Northern Thai', 'Southern Thai'],
    MM: ['Burmese', 'Shan', 'Karen', 'Kachin', 'Chin'],
    KH: ['Khmer', 'Cham'],
    LA: ['Lao', 'Khmu', 'Hmong'],
    MY: ['Malay', 'Mandarin', 'Tamil', 'Iban', 'Kadazan'],
    SG: ['Malay', 'Mandarin', 'Tamil', 'Hokkien'],
    TL: ['Tetum', 'Portuguese', 'Mambai'],
    BN: ['Malay'],

    // ── East Asia ────────────────────────────────────────────────
    CN: ['Mandarin', 'Cantonese', 'Wu', 'Min', 'Hakka', 'Tibetan', 'Uyghur'],
    JP: ['Japanese'],
    KR: ['Korean'],
    KP: ['Korean'],
    TW: ['Mandarin', 'Taiwanese Hokkien', 'Hakka'],
    HK: ['Cantonese', 'Mandarin'],
    MN: ['Mongolian', 'Kazakh'],

    // ── Central Asia ─────────────────────────────────────────────
    KZ: ['Kazakh', 'Russian'],
    UZ: ['Uzbek', 'Russian', 'Tajik', 'Kazakh'],
    TM: ['Turkmen', 'Russian', 'Uzbek'],
    TJ: ['Tajik', 'Russian', 'Uzbek'],
    KG: ['Kyrgyz', 'Russian'],

    // ── Europe ───────────────────────────────────────────────────
    RU: ['Russian', 'Tatar', 'Bashkir', 'Chechen', 'Chuvash'],
    DE: ['German', 'Low German', 'Sorbian'],
    FR: ['French', 'Alsatian', 'Breton', 'Occitan'],
    ES: ['Spanish', 'Catalan', 'Galician', 'Basque', 'Valencian'],
    IT: ['Italian', 'Sicilian', 'Neapolitan', 'Sardinian', 'Venetian'],
    PT: ['Portuguese', 'Mirandese'],
    PL: ['Polish', 'Silesian', 'Kashubian'],
    UA: ['Ukrainian', 'Russian', 'Rusyn'],
    NL: ['Dutch', 'Frisian', 'Zeelandic'],
    BE: ['Dutch', 'French', 'German', 'Walloon'],
    SE: ['Swedish', 'Sami'],
    NO: ['Norwegian', 'Sami', 'Kven'],
    DK: ['Danish', 'Faroese'],
    FI: ['Finnish', 'Swedish', 'Sami'],
    CZ: ['Czech', 'Slovak', 'Romani'],
    SK: ['Slovak', 'Hungarian', 'Rusyn'],
    HU: ['Hungarian', 'Romani', 'German'],
    RO: ['Romanian', 'Hungarian', 'Romani'],
    BG: ['Bulgarian', 'Turkish', 'Romani'],
    HR: ['Croatian', 'Italian'],
    RS: ['Serbian', 'Hungarian', 'Romani', 'Albanian'],
    GR: ['Greek'],
    AL: ['Albanian', 'Greek'],
    MK: ['Macedonian', 'Albanian'],
    BA: ['Bosnian', 'Serbian', 'Croatian'],
    SI: ['Slovenian', 'Hungarian', 'Italian'],
    LT: ['Lithuanian', 'Russian', 'Polish'],
    LV: ['Latvian', 'Russian'],
    EE: ['Estonian', 'Russian'],
    AT: ['German', 'Bavarian', 'Alemannic'],
    CH: ['German', 'French', 'Italian', 'Romansh'],
    LU: ['Luxembourgish', 'French', 'German'],
    IE: ['Irish', 'Hiberno-English'],
    GB: ['Welsh', 'Scottish Gaelic', 'Scots', 'Cornish'],
    IS: ['Icelandic'],
    MT: ['Maltese'],
    CY: ['Greek', 'Turkish'],
    MD: ['Romanian', 'Russian', 'Gagauz'],
    GE: ['Georgian', 'Mingrelian', 'Armenian', 'Azerbaijani'],
    AM: ['Armenian'],
    AZ: ['Azerbaijani', 'Russian', 'Armenian'],
    BY: ['Belarusian', 'Russian'],
    ME: ['Montenegrin', 'Serbian'],
    XK: ['Albanian', 'Serbian'],
    SM: ['Italian'],
    MC: ['French'],
    AD: ['Catalan', 'Spanish', 'French'],
    LI: ['German', 'Alemannic'],
    VA: ['Italian', 'Latin'],

    // ── Americas — North & Central ───────────────────────────────
    US: ['Spanish', 'Navajo', 'Cherokee', 'Yupik', 'Hawaiian'],
    CA: ['French', 'Cree', 'Inuktitut', 'Ojibwe'],
    MX: ['Spanish', 'Nahuatl', 'Mayan', 'Zapotec', 'Mixtec'],
    GT: ['Spanish', "K'iche'", 'Mam', 'Kaqchikel', "Q'eqchi'"],
    BZ: ['Kriol', 'Spanish', 'Mayan', 'Garifuna'],
    HN: ['Spanish', 'Miskito', 'Garifuna'],
    SV: ['Spanish', 'Nawat'],
    NI: ['Spanish', 'Miskito', 'Creole'],
    CR: ['Spanish'],
    PA: ['Spanish', 'Ngäbere', 'Kuna'],
    CU: ['Spanish'],
    DO: ['Spanish', 'Haitian Creole'],
    HT: ['Haitian Creole', 'French'],
    JM: ['Jamaican Patois'],
    TT: ['Trinidadian Creole', 'Hindi', 'French Creole'],
    BB: ['Bajan Creole'],
    LC: ['Saint Lucian Creole', 'French'],
    VC: ['Vincentian Creole'],
    GD: ['Grenadian Creole'],
    AG: ['Antiguan Creole'],
    DM: ['Dominican Creole', 'French'],
    KN: ['Saint Kitts Creole'],
    BS: ['Bahamian Creole'],
    TC: ['Turks and Caicos Creole'],
    PR: ['Spanish'],
    CW: ['Papiamentu', 'Dutch'],
    AW: ['Papiamentu', 'Dutch'],
    SX: ['Sint Maarten Creole', 'Dutch'],

    // ── Americas — South ─────────────────────────────────────────
    BR: ['Portuguese', 'Nheengatu', 'Caipira'],
    CO: ['Spanish', 'Wayuu', 'Palenquero'],
    VE: ['Spanish', 'Wayuu', 'Pemón'],
    AR: ['Spanish', 'Quechua', 'Guaraní'],
    PE: ['Spanish', 'Quechua', 'Aymara', 'Shipibo'],
    CL: ['Spanish', 'Mapuche', 'Aymara'],
    EC: ['Spanish', 'Quechua', 'Shuar'],
    BO: ['Spanish', 'Quechua', 'Aymara', 'Guaraní'],
    PY: ['Spanish', 'Guaraní'],
    UY: ['Spanish', 'Uruguayan Creole'],
    GY: ['Guyanese Creole', 'Hindi', 'Arawak'],
    SR: ['Dutch', 'Sranan Tongo', 'Sarnami Hindustani'],
    GF: ['French', 'French Guianese Creole'],

    // ── Oceania ──────────────────────────────────────────────────
    AU: ['Pitjantjatjara', 'Warlpiri', 'Arrernte', 'Yolŋu Matha'],
    NZ: ['Māori', 'Samoan', 'Cook Islands Māori'],
    PG: ['Tok Pisin', 'Hiri Motu', 'Enga', 'Melpa'],
    FJ: ['Fijian', 'Hindi', 'Rotuman'],
    SB: ['Pijin', 'Kwara\'ae', 'Are\'are'],
    VU: ['Bislama', 'French', 'Nahuatl'],
    WS: ['Samoan'],
    TO: ['Tongan'],
    KI: ['Gilbertese', 'Tuvaluan'],
    FM: ['Chuukese', 'Pohnpeian', 'Kosraean'],
    PW: ['Palauan'],
    MH: ['Marshallese'],
    NR: ['Nauruan'],
    TV: ['Tuvaluan'],
    CK: ['Cook Islands Māori'],
    NU: ['Niuean'],
    WF: ['Wallisian', 'Futunan', 'French'],
    PF: ['Tahitian', 'French'],
    NC: ['French', 'Kanak languages'],
};

/**
 * Get language suggestions for the current user's country.
 * Always includes English; deduplicates and preserves order.
 */
function getLanguageSuggestionsForUser() {
    try {
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const countryCode = (userData.country_code || '').toUpperCase();
        const countryLanguages = COUNTRY_TO_LANGUAGES[countryCode] || [];
        // Merge country languages + English, deduplicated, English last if not in country list
        const suggestions = [...countryLanguages];
        if (!suggestions.includes('English')) suggestions.push('English');
        return suggestions;
    } catch (e) {
        return ['English'];
    }
}

/**
 * Render language suggestion buttons based on user's country
 */
function renderCourseRequestLanguageSuggestions() {
    const container = document.getElementById('courseRequestLanguageSuggestions');
    if (!container) return;

    const suggestions = getLanguageSuggestionsForUser();
    const btnStyle = 'padding: 0.25rem 0.75rem; background: var(--bg-secondary, #f3f4f6); border: 1px solid var(--border-color, #e5e7eb); border-radius: 20px; font-size: 0.8rem; cursor: pointer;';

    container.innerHTML =
        '<span style="font-size: 0.85rem; color: #6b7280;">Suggestions:</span>' +
        suggestions.map(lang =>
            `<button type="button" onclick="addCourseRequestLanguageSuggestion('${lang}')" style="${btnStyle}">${lang}</button>`
        ).join('');
}

/**
 * Open the course request modal
 */
window.openCourseRequestModal = async function() {
    let modal = document.getElementById('course-request-modal');

    // If modal not in DOM, try to load it via ModalLoader
    if (!modal) {
        // Try using ModalLoader if available
        if (typeof ModalLoader !== 'undefined' && ModalLoader.load) {
            try {
                await ModalLoader.load('course-request-modal');
                modal = document.getElementById('course-request-modal');
            } catch (e) {
                console.error('[CourseRequestManager] Failed to load modal via ModalLoader:', e);
            }
        }

        // If still not found, fetch directly
        if (!modal) {
            try {
                const response = await fetch('../modals/common-modals/course-request-modal.html');
                if (response.ok) {
                    const html = await response.text();
                    const container = document.getElementById('modal-container') || document.body;
                    container.insertAdjacentHTML('beforeend', html);
                    modal = document.getElementById('course-request-modal');
                }
            } catch (e) {
                console.error('[CourseRequestManager] Failed to fetch modal:', e);
            }
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        document.body.style.overflow = 'hidden';

        // Reset form
        resetCourseRequestForm();

        // Populate language suggestions based on user's country
        renderCourseRequestLanguageSuggestions();

        // Update submit button text based on page context
        updateSubmitButtonText();
    } else {
        console.error('[CourseRequestManager] Course request modal not found');
        alert('Failed to load course request modal. Please refresh the page and try again.');
    }
};

/**
 * Update submit button text based on page context
 */
function updateSubmitButtonText() {
    const activeRole = localStorage.getItem('userRole') || '';
    const isTutor = activeRole === 'tutor';

    const title       = document.getElementById('courseRequestModalTitle');
    const subtitle    = document.getElementById('courseRequestModalSubtitle');
    const submitLabel = document.getElementById('submitCourseRequestLabel');

    if (isTutor) {
        if (title)       title.innerHTML         = '<i class="fas fa-plus-circle"></i> Add New Course';
        if (subtitle)    subtitle.textContent    = 'Your course will be live immediately';
        if (submitLabel) submitLabel.textContent = 'Add Course';
    } else {
        if (title)       title.innerHTML         = '<i class="fas fa-plus-circle"></i> Request a Course';
        if (subtitle)    subtitle.textContent    = 'Submit a request and our team will review it';
        if (submitLabel) submitLabel.textContent = 'Request Course';
    }
}

/**
 * Close the course request modal
 */
window.closeCourseRequestModal = function(event) {
    // Stop event propagation if event is provided
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const modal = document.getElementById('course-request-modal');
    if (modal) {
        console.log('[CourseRequestManager] Closing modal...');
        console.log('[CourseRequestManager] Modal current display:', window.getComputedStyle(modal).display);
        console.log('[CourseRequestManager] Modal current visibility:', window.getComputedStyle(modal).visibility);

        // Force hide with setProperty to override inline styles
        modal.style.setProperty('display', 'none', 'important');
        modal.style.setProperty('visibility', 'hidden', 'important');
        modal.style.setProperty('opacity', '0', 'important');

        modal.classList.add('hidden');
        modal.classList.remove('active');
        document.body.style.overflow = '';

        console.log('[CourseRequestManager] Modal after close - display:', window.getComputedStyle(modal).display);
        console.log('[CourseRequestManager] Modal closed successfully');
    } else {
        console.warn('[CourseRequestManager] Modal element not found when trying to close');
    }
};

/**
 * Reset the course request form
 */
function resetCourseRequestForm() {
    // Reset form fields
    const form = document.getElementById('courseRequestForm');
    if (form) form.reset();

    // Reset thumbnail
    const thumbnailPreview = document.getElementById('courseRequestThumbnailPreview');
    if (thumbnailPreview) {
        thumbnailPreview.innerHTML = `
            <i class="fas fa-cloud-upload-alt" style="font-size: 2.5rem; color: #9ca3af; margin-bottom: 0.5rem;"></i>
            <p style="margin: 0; color: #6b7280; font-weight: 500;">Click to upload thumbnail</p>
            <span style="font-size: 0.8rem; color: #9ca3af;">PNG, JPG, GIF up to 5MB</span>
        `;
    }
    const thumbnailInput = document.getElementById('courseRequestThumbnail');
    if (thumbnailInput) thumbnailInput.value = '';

    // Reset custom category
    const customCategoryInput = document.getElementById('courseRequestCustomCategory');
    if (customCategoryInput) {
        customCategoryInput.style.display = 'none';
        customCategoryInput.value = '';
    }

    // Reset languages
    courseRequestLanguages = [];
    const languageTagsContainer = document.getElementById('courseRequestLanguageTagsContainer');
    if (languageTagsContainer) languageTagsContainer.innerHTML = '';

    // Reset tags
    courseRequestTags = [];
    const tagsContainer = document.getElementById('courseRequestTagsContainer');
    if (tagsContainer) tagsContainer.innerHTML = '';

    // Reset lesson titles
    courseRequestLessonTitles = [];
    const lessonTitlesContainer = document.getElementById('courseRequestLessonTitlesContainer');
    if (lessonTitlesContainer) {
        lessonTitlesContainer.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem;">Enter number of lessons above to add lesson titles</p>';
    }
}

/**
 * Trigger thumbnail file input
 */
window.triggerCourseRequestThumbnailUpload = function() {
    const input = document.getElementById('courseRequestThumbnailInput');
    if (input) input.click();
};

/**
 * Handle thumbnail upload
 */
window.handleCourseRequestThumbnailUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('courseRequestThumbnailPreview');
        if (preview) {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 150px; border-radius: 8px; object-fit: cover;">`;
        }
        const hiddenInput = document.getElementById('courseRequestThumbnail');
        if (hiddenInput) hiddenInput.value = e.target.result;
    };
    reader.readAsDataURL(file);
};

/**
 * Toggle custom category input
 */
window.toggleCourseRequestCustomCategory = function() {
    const select = document.getElementById('courseRequestCategory');
    const customInput = document.getElementById('courseRequestCustomCategory');

    if (select && customInput) {
        if (select.value === 'Other') {
            customInput.style.display = 'block';
            customInput.required = true;
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }
};

/**
 * Handle language keypress (Enter to add)
 */
window.handleCourseRequestLanguageKeypress = function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addCourseRequestLanguageTag();
    }
};

/**
 * Add language tag from input
 */
window.addCourseRequestLanguageTag = function() {
    const input = document.getElementById('courseRequestLanguageInput');
    if (!input || !input.value.trim()) return;

    const language = input.value.trim();
    addCourseRequestLanguage(language);
    input.value = '';
};

/**
 * Add language from suggestion
 */
window.addCourseRequestLanguageSuggestion = function(language) {
    addCourseRequestLanguage(language);
};

/**
 * Add language to the list
 */
function addCourseRequestLanguage(language) {
    if (courseRequestLanguages.includes(language)) {
        return; // Already added
    }

    courseRequestLanguages.push(language);
    renderCourseRequestLanguageTags();
}

/**
 * Remove language from the list
 */
window.removeCourseRequestLanguage = function(language) {
    courseRequestLanguages = courseRequestLanguages.filter(l => l !== language);
    renderCourseRequestLanguageTags();
};

/**
 * Render language tags
 */
function renderCourseRequestLanguageTags() {
    const container = document.getElementById('courseRequestLanguageTagsContainer');
    if (!container) return;

    container.innerHTML = courseRequestLanguages.map(lang => `
        <span style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: #3b82f6; color: white; border-radius: 20px; font-size: 0.875rem; font-weight: 500;">
            ${lang}
            <button type="button" onclick="removeCourseRequestLanguage('${lang}')" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center; border-radius: 50%; width: 18px; height: 18px; justify-content: center; transition: all 0.2s; font-size: 16px; line-height: 1; font-weight: bold;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                ×
            </button>
        </span>
    `).join('');
}

/**
 * Handle tag keypress (Enter to add)
 */
window.handleCourseRequestTagKeypress = function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addCourseRequestTag();
    }
};

/**
 * Add tag from input
 */
window.addCourseRequestTag = function() {
    const input = document.getElementById('courseRequestTagInput');
    if (!input || !input.value.trim()) return;

    const tag = input.value.trim().toLowerCase();
    addCourseRequestTagToList(tag);
    input.value = '';
};

/**
 * Add tag from suggestion
 */
window.addCourseRequestTagSuggestion = function(tag) {
    addCourseRequestTagToList(tag);
};

/**
 * Add tag to the list
 */
function addCourseRequestTagToList(tag) {
    if (courseRequestTags.includes(tag)) {
        return; // Already added
    }

    courseRequestTags.push(tag);
    renderCourseRequestTags();
}

/**
 * Remove tag from the list
 */
window.removeCourseRequestTag = function(tag) {
    courseRequestTags = courseRequestTags.filter(t => t !== tag);
    renderCourseRequestTags();
};

/**
 * Render tags
 */
function renderCourseRequestTags() {
    const container = document.getElementById('courseRequestTagsContainer');
    if (!container) return;

    container.innerHTML = courseRequestTags.map(tag => `
        <span style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: #10b981; color: white; border-radius: 20px; font-size: 0.875rem; font-weight: 500;">
            ${tag}
            <button type="button" onclick="removeCourseRequestTag('${tag}')" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center; border-radius: 50%; width: 18px; height: 18px; justify-content: center; transition: all 0.2s; font-size: 16px; line-height: 1; font-weight: bold;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                ×
            </button>
        </span>
    `).join('');
}

/**
 * Update lesson title inputs based on number of lessons
 */
window.updateCourseRequestLessonTitles = function() {
    const numLessons = parseInt(document.getElementById('courseRequestLessons')?.value) || 0;
    const container = document.getElementById('courseRequestLessonTitlesContainer');

    if (!container) return;

    if (numLessons <= 0) {
        container.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem;">Enter number of lessons above to add lesson titles</p>';
        courseRequestLessonTitles = [];
        return;
    }

    // Preserve existing titles
    const existingTitles = [...courseRequestLessonTitles];
    courseRequestLessonTitles = [];

    let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
    for (let i = 1; i <= numLessons; i++) {
        const existingTitle = existingTitles[i - 1] || '';
        courseRequestLessonTitles.push(existingTitle);
        html += `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="width: 30px; height: 30px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #374151; flex-shrink: 0;">${i}</span>
                <input type="text"
                       placeholder="Lesson ${i} title"
                       value="${existingTitle}"
                       onchange="courseRequestLessonTitles[${i - 1}] = this.value"
                       style="flex: 1; padding: 0.5rem 0.75rem; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 0.9rem;">
            </div>
        `;
    }
    html += '</div>';

    container.innerHTML = html;
};

/**
 * Validate if course already exists or is similar
 */
async function validateCourseExists(courseName) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const response = await fetch(`${COURSE_REQUEST_API_URL}/api/courses?search=${encodeURIComponent(courseName)}&limit=20`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok) {
            const courses = await response.json();

            // Check for exact match
            const exactMatch = courses.find(c =>
                c.course_name && c.course_name.toLowerCase() === courseName.toLowerCase()
            );

            if (exactMatch) {
                return {
                    exists: true,
                    exact: true,
                    match: exactMatch,
                    message: `Course "${exactMatch.course_name}" already exists in the system.`
                };
            }

            // Check for similar matches using Levenshtein distance
            const similarCourses = courses.filter(c => {
                if (!c.course_name) return false;
                const similarity = calculateSimilarity(courseName.toLowerCase(), c.course_name.toLowerCase());
                return similarity > 0.6; // 60% similarity threshold
            });

            if (similarCourses.length > 0) {
                return {
                    exists: false,
                    similar: true,
                    matches: similarCourses,
                    message: `Similar course${similarCourses.length > 1 ? 's' : ''} found: ${similarCourses.map(c => c.course_name).join(', ')}`
                };
            }

            return { exists: false, similar: false };
        }

        return { exists: false, similar: false };
    } catch (error) {
        console.error('Error validating course:', error);
        return { exists: false, similar: false };
    }
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Get Levenshtein edit distance between two strings
 */
function getEditDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Submit course request
 */
window.submitCourseRequest = async function() {
    const name = document.getElementById('courseRequestName')?.value?.trim();
    let category = document.getElementById('courseRequestCategory')?.value;
    const customCategory = document.getElementById('courseRequestCustomCategory')?.value?.trim();
    const level = document.getElementById('courseRequestLevel')?.value;
    const duration = document.getElementById('courseRequestDuration')?.value;
    const lessons = document.getElementById('courseRequestLessons')?.value;
    const description = document.getElementById('courseRequestDescription')?.value?.trim();
    const thumbnail = document.getElementById('courseRequestThumbnail')?.value;

    // Use custom category if "Other" selected
    if (category === 'Other' && customCategory) {
        category = customCategory;
    }

    // Validate required fields
    if (!name) {
        alert('Please enter a course name');
        return;
    }
    if (!category) {
        alert('Please select a category');
        return;
    }
    if (!level) {
        alert('Please select a grade level');
        return;
    }

    // Show loading state on submit button
    const submitBtn = document.getElementById('submitCourseRequestBtn');
    const originalContent = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    }

    // Validate if course already exists or is similar
    const validation = await validateCourseExists(name);

    if (validation.exists && validation.exact) {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
        alert(`❌ ${validation.message}\n\nPlease search for this course in the system instead of requesting it again.`);
        return;
    }

    if (validation.similar) {
        const proceed = confirm(
            `⚠️ ${validation.message}\n\n` +
            `Did you mean one of these courses?\n\n` +
            `Click "Cancel" to review, or "OK" to continue with your request anyway.`
        );

        if (!proceed) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
            return;
        }
    }

    // Update button text to "Submitting..."
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    // Collect lesson titles from the form
    const lessonInputs = document.querySelectorAll('#courseRequestLessonTitlesContainer input[type="text"]');
    const lessonTitles = Array.from(lessonInputs).map(input => input.value.trim()).filter(t => t);

    // Map to backend expected field names (PackageCourseRequest model)
    const courseData = {
        course_name: name,
        course_category: category,
        course_level: level,
        duration: duration ? parseInt(duration) : 0,
        lessons: lessons ? parseInt(lessons) : 0,
        course_description: description || null,
        language: courseRequestLanguages.length > 0 ? courseRequestLanguages : ["English"],
        tags: courseRequestTags.length > 0 ? courseRequestTags : [],
        lesson_title: lessonTitles,
        thumbnail: thumbnail || null
    };

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('You must be logged in to submit a course request.');
            return;
        }
        const response = await fetch(`${COURSE_REQUEST_API_URL}/api/tutor/packages/course-request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(courseData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Course request submitted:', result);

            // Show success message
            alert(result.message || 'Course submitted successfully.');

            // Close modal
            closeCourseRequestModal();

            // Refresh requests panel if function exists
            if (typeof loadTutorRequests === 'function') {
                loadTutorRequests();
            }
        } else {
            const error = await response.text();
            console.error('Failed to submit course request:', error);
            alert('Failed to submit course request. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting course request:', error);
        alert('Error submitting course request. Please try again.');
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    }
};

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('course-request-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeCourseRequestModal();
        }
    }
});
