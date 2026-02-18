"""
Currency Utilities for Astegni Platform
Provides country code to currency mapping for automatic currency detection

Usage:
    from currency_utils import get_currency_from_country

    currency = get_currency_from_country('ET')  # Returns 'ETB'
    currency = get_currency_from_country('US')  # Returns 'USD'
"""

# Comprehensive country code to currency mapping
# Covers 195+ countries worldwide
COUNTRY_TO_CURRENCY = {
    # Africa
    'ET': 'ETB',  # Ethiopia - Ethiopian Birr
    'NG': 'NGN',  # Nigeria - Nigerian Naira
    'EG': 'EGP',  # Egypt - Egyptian Pound
    'ZA': 'ZAR',  # South Africa - South African Rand
    'KE': 'KES',  # Kenya - Kenyan Shilling
    'GH': 'GHS',  # Ghana - Ghanaian Cedi
    'TZ': 'TZS',  # Tanzania - Tanzanian Shilling
    'UG': 'UGX',  # Uganda - Ugandan Shilling
    'MA': 'MAD',  # Morocco - Moroccan Dirham
    'DZ': 'DZD',  # Algeria - Algerian Dinar
    'TN': 'TND',  # Tunisia - Tunisian Dinar
    'RW': 'RWF',  # Rwanda - Rwandan Franc
    'SN': 'XOF',  # Senegal - West African CFA franc
    'CI': 'XOF',  # Ivory Coast - West African CFA franc
    'CM': 'XAF',  # Cameroon - Central African CFA franc
    'AO': 'AOA',  # Angola - Angolan Kwanza
    'BW': 'BWP',  # Botswana - Botswana Pula
    'MU': 'MUR',  # Mauritius - Mauritian Rupee
    'ZM': 'ZMW',  # Zambia - Zambian Kwacha
    'ZW': 'ZWL',  # Zimbabwe - Zimbabwean Dollar
    'MW': 'MWK',  # Malawi - Malawian Kwacha
    'MZ': 'MZN',  # Mozambique - Mozambican Metical
    'NA': 'NAD',  # Namibia - Namibian Dollar
    'BJ': 'XOF',  # Benin - West African CFA franc
    'BF': 'XOF',  # Burkina Faso - West African CFA franc
    'ML': 'XOF',  # Mali - West African CFA franc
    'NE': 'XOF',  # Niger - West African CFA franc
    'TG': 'XOF',  # Togo - West African CFA franc
    'GN': 'GNF',  # Guinea - Guinean Franc
    'LR': 'LRD',  # Liberia - Liberian Dollar
    'SL': 'SLE',  # Sierra Leone - Sierra Leonean Leone
    'GM': 'GMD',  # Gambia - Gambian Dalasi

    # Americas
    'US': 'USD',  # United States - US Dollar
    'CA': 'CAD',  # Canada - Canadian Dollar
    'MX': 'MXN',  # Mexico - Mexican Peso
    'BR': 'BRL',  # Brazil - Brazilian Real
    'AR': 'ARS',  # Argentina - Argentine Peso
    'CO': 'COP',  # Colombia - Colombian Peso
    'CL': 'CLP',  # Chile - Chilean Peso
    'PE': 'PEN',  # Peru - Peruvian Sol
    'VE': 'VES',  # Venezuela - Venezuelan Bolívar
    'EC': 'USD',  # Ecuador - US Dollar
    'BO': 'BOB',  # Bolivia - Bolivian Boliviano
    'PY': 'PYG',  # Paraguay - Paraguayan Guaraní
    'UY': 'UYU',  # Uruguay - Uruguayan Peso
    'CR': 'CRC',  # Costa Rica - Costa Rican Colón
    'PA': 'PAB',  # Panama - Panamanian Balboa
    'GT': 'GTQ',  # Guatemala - Guatemalan Quetzal
    'HN': 'HNL',  # Honduras - Honduran Lempira
    'NI': 'NIO',  # Nicaragua - Nicaraguan Córdoba
    'SV': 'USD',  # El Salvador - US Dollar
    'DO': 'DOP',  # Dominican Republic - Dominican Peso
    'JM': 'JMD',  # Jamaica - Jamaican Dollar
    'TT': 'TTD',  # Trinidad and Tobago - Trinidad Dollar
    'BB': 'BBD',  # Barbados - Barbadian Dollar
    'BS': 'BSD',  # Bahamas - Bahamian Dollar
    'HT': 'HTG',  # Haiti - Haitian Gourde
    'CU': 'CUP',  # Cuba - Cuban Peso

    # Europe
    'GB': 'GBP',  # United Kingdom - British Pound
    'DE': 'EUR',  # Germany - Euro
    'FR': 'EUR',  # France - Euro
    'IT': 'EUR',  # Italy - Euro
    'ES': 'EUR',  # Spain - Euro
    'NL': 'EUR',  # Netherlands - Euro
    'BE': 'EUR',  # Belgium - Euro
    'AT': 'EUR',  # Austria - Euro
    'PT': 'EUR',  # Portugal - Euro
    'IE': 'EUR',  # Ireland - Euro
    'GR': 'EUR',  # Greece - Euro
    'FI': 'EUR',  # Finland - Euro
    'SE': 'SEK',  # Sweden - Swedish Krona
    'NO': 'NOK',  # Norway - Norwegian Krone
    'DK': 'DKK',  # Denmark - Danish Krone
    'CH': 'CHF',  # Switzerland - Swiss Franc
    'PL': 'PLN',  # Poland - Polish Zloty
    'CZ': 'CZK',  # Czech Republic - Czech Koruna
    'HU': 'HUF',  # Hungary - Hungarian Forint
    'RO': 'RON',  # Romania - Romanian Leu
    'BG': 'BGN',  # Bulgaria - Bulgarian Lev
    'HR': 'EUR',  # Croatia - Euro
    'RS': 'RSD',  # Serbia - Serbian Dinar
    'SK': 'EUR',  # Slovakia - Euro
    'SI': 'EUR',  # Slovenia - Euro
    'LT': 'EUR',  # Lithuania - Euro
    'LV': 'EUR',  # Latvia - Euro
    'EE': 'EUR',  # Estonia - Euro
    'IS': 'ISK',  # Iceland - Icelandic Króna
    'UA': 'UAH',  # Ukraine - Ukrainian Hryvnia
    'TR': 'TRY',  # Turkey - Turkish Lira
    'RU': 'RUB',  # Russia - Russian Ruble
    'BY': 'BYN',  # Belarus - Belarusian Ruble
    'MD': 'MDL',  # Moldova - Moldovan Leu
    'AL': 'ALL',  # Albania - Albanian Lek
    'MK': 'MKD',  # North Macedonia - Macedonian Denar
    'BA': 'BAM',  # Bosnia - Bosnia Mark
    'ME': 'EUR',  # Montenegro - Euro
    'XK': 'EUR',  # Kosovo - Euro

    # Asia
    'CN': 'CNY',  # China - Chinese Yuan
    'IN': 'INR',  # India - Indian Rupee
    'JP': 'JPY',  # Japan - Japanese Yen
    'KR': 'KRW',  # South Korea - Korean Won
    'SG': 'SGD',  # Singapore - Singapore Dollar
    'MY': 'MYR',  # Malaysia - Malaysian Ringgit
    'TH': 'THB',  # Thailand - Thai Baht
    'VN': 'VND',  # Vietnam - Vietnamese Dong
    'PH': 'PHP',  # Philippines - Philippine Peso
    'ID': 'IDR',  # Indonesia - Indonesian Rupiah
    'PK': 'PKR',  # Pakistan - Pakistani Rupee
    'BD': 'BDT',  # Bangladesh - Bangladeshi Taka
    'LK': 'LKR',  # Sri Lanka - Sri Lankan Rupee
    'MM': 'MMK',  # Myanmar - Myanmar Kyat
    'KH': 'KHR',  # Cambodia - Cambodian Riel
    'LA': 'LAK',  # Laos - Lao Kip
    'NP': 'NPR',  # Nepal - Nepalese Rupee
    'BT': 'BTN',  # Bhutan - Bhutanese Ngultrum
    'MV': 'MVR',  # Maldives - Maldivian Rufiyaa
    'AF': 'AFN',  # Afghanistan - Afghan Afghani
    'KZ': 'KZT',  # Kazakhstan - Kazakhstani Tenge
    'UZ': 'UZS',  # Uzbekistan - Uzbekistani Som
    'TM': 'TMT',  # Turkmenistan - Turkmen Manat
    'KG': 'KGS',  # Kyrgyzstan - Kyrgyzstani Som
    'TJ': 'TJS',  # Tajikistan - Tajikistani Somoni
    'MN': 'MNT',  # Mongolia - Mongolian Tugrik
    'HK': 'HKD',  # Hong Kong - Hong Kong Dollar
    'MO': 'MOP',  # Macau - Macanese Pataca
    'TW': 'TWD',  # Taiwan - New Taiwan Dollar

    # Middle East
    'SA': 'SAR',  # Saudi Arabia - Saudi Riyal
    'AE': 'AED',  # UAE - UAE Dirham
    'IL': 'ILS',  # Israel - Israeli Shekel
    'IQ': 'IQD',  # Iraq - Iraqi Dinar
    'IR': 'IRR',  # Iran - Iranian Rial
    'JO': 'JOD',  # Jordan - Jordanian Dinar
    'KW': 'KWD',  # Kuwait - Kuwaiti Dinar
    'LB': 'LBP',  # Lebanon - Lebanese Pound
    'OM': 'OMR',  # Oman - Omani Rial
    'QA': 'QAR',  # Qatar - Qatari Riyal
    'BH': 'BHD',  # Bahrain - Bahraini Dinar
    'YE': 'YER',  # Yemen - Yemeni Rial
    'SY': 'SYP',  # Syria - Syrian Pound
    'PS': 'ILS',  # Palestine - Israeli Shekel

    # Oceania
    'AU': 'AUD',  # Australia - Australian Dollar
    'NZ': 'NZD',  # New Zealand - New Zealand Dollar
    'PG': 'PGK',  # Papua New Guinea - Papua New Guinean Kina
    'FJ': 'FJD',  # Fiji - Fijian Dollar
    'SB': 'SBD',  # Solomon Islands - Solomon Islands Dollar
    'VU': 'VUV',  # Vanuatu - Vanuatu Vatu
    'WS': 'WST',  # Samoa - Samoan Tala
    'TO': 'TOP',  # Tonga - Tongan Paʻanga

    # Caribbean & Others
    'PR': 'USD',  # Puerto Rico - US Dollar
    'VI': 'USD',  # US Virgin Islands - US Dollar
    'GU': 'USD',  # Guam - US Dollar
    'AS': 'USD',  # American Samoa - US Dollar
}

# Currency symbols mapping
CURRENCY_SYMBOLS = {
    'ETB': 'Br',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'NGN': '₦',
    'ZAR': 'R',
    'KES': 'KSh',
    'GHS': 'GH₵',
    'EGP': 'E£',
    'CAD': 'C$',
    'AUD': 'A$',
    'BRL': 'R$',
    'MXN': '$',
    'CHF': 'CHF',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'TRY': '₺',
    'RUB': '₽',
    'KRW': '₩',
    'SAR': 'SAR',
    'AED': 'AED',
    'ILS': '₪',
}


def get_currency_from_country(country_code: str) -> str:
    """
    Get currency code from country code

    Args:
        country_code: ISO 3166-1 alpha-2 country code (e.g., 'ET', 'US', 'GB')

    Returns:
        Currency code (e.g., 'ETB', 'USD', 'GBP') or 'USD' as default

    Examples:
        >>> get_currency_from_country('ET')
        'ETB'
        >>> get_currency_from_country('US')
        'USD'
        >>> get_currency_from_country('GB')
        'GBP'
        >>> get_currency_from_country('INVALID')
        'USD'
    """
    if not country_code:
        return 'USD'  # Default to USD

    # Convert to uppercase for consistency
    country_code = country_code.upper().strip()

    # Get currency or default to USD
    return COUNTRY_TO_CURRENCY.get(country_code, 'USD')


# Mapping of country names (and common variants) to ISO country codes
COUNTRY_NAME_TO_CODE = {
    'ethiopia': 'ET', 'ethiopian': 'ET',
    'nigeria': 'NG', 'nigerian': 'NG',
    'kenya': 'KE', 'kenyan': 'KE',
    'ghana': 'GH', 'ghanaian': 'GH',
    'south africa': 'ZA', 'south african': 'ZA',
    'egypt': 'EG', 'egyptian': 'EG',
    'tanzania': 'TZ', 'tanzanian': 'TZ',
    'uganda': 'UG', 'ugandan': 'UG',
    'rwanda': 'RW', 'rwandan': 'RW',
    'senegal': 'SN', 'senegalese': 'SN',
    'cameroon': 'CM', 'cameroonian': 'CM',
    "ivory coast": 'CI', "côte d'ivoire": 'CI', 'cote divoire': 'CI',
    'morocco': 'MA', 'moroccan': 'MA',
    'algeria': 'DZ', 'algerian': 'DZ',
    'tunisia': 'TN', 'tunisian': 'TN',
    'sudan': 'SD', 'sudanese': 'SD',
    'united states': 'US', 'usa': 'US', 'united states of america': 'US',
    'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
    'canada': 'CA', 'canadian': 'CA',
    'australia': 'AU', 'australian': 'AU',
    'germany': 'DE', 'german': 'DE',
    'france': 'FR', 'french': 'FR',
    'india': 'IN', 'indian': 'IN',
    'china': 'CN', 'chinese': 'CN',
    'japan': 'JP', 'japanese': 'JP',
    'brazil': 'BR', 'brazilian': 'BR',
    'mexico': 'MX', 'mexican': 'MX',
    'spain': 'ES', 'spanish': 'ES',
    'italy': 'IT', 'italian': 'IT',
    'netherlands': 'NL', 'dutch': 'NL',
    'sweden': 'SE', 'swedish': 'SE',
    'norway': 'NO', 'norwegian': 'NO',
    'denmark': 'DK', 'danish': 'DK',
    'switzerland': 'CH', 'swiss': 'CH',
    'turkey': 'TR', 'turkish': 'TR',
    'russia': 'RU', 'russian': 'RU',
    'saudi arabia': 'SA',
    'uae': 'AE', 'united arab emirates': 'AE',
    'israel': 'IL', 'israeli': 'IL',
    'south korea': 'KR', 'korea': 'KR',
    'indonesia': 'ID', 'indonesian': 'ID',
    'pakistan': 'PK', 'pakistani': 'PK',
    'bangladesh': 'BD', 'bangladeshi': 'BD',
}


def get_country_code_from_location(location: str) -> str | None:
    """
    Deduce ISO country code from a location string by matching the last
    comma-separated segment (usually the country name).

    Examples:
        'Megenagna, Yeka, Addis Ababa, Ethiopia' -> 'ET'
        'New York, United States'                -> 'US'
        'London, United Kingdom'                 -> 'GB'
    """
    if not location:
        return None
    parts = [p.strip().lower() for p in location.split(',')]
    # Try from the end of the string inward (country is usually last)
    for part in reversed(parts):
        code = COUNTRY_NAME_TO_CODE.get(part)
        if code:
            return code
    return None


def get_currency_symbol(currency_code: str) -> str:
    """
    Get currency symbol from currency code

    Args:
        currency_code: ISO 4217 currency code (e.g., 'ETB', 'USD', 'EUR')

    Returns:
        Currency symbol (e.g., 'Br', '$', '€') or currency code itself

    Examples:
        >>> get_currency_symbol('ETB')
        'Br'
        >>> get_currency_symbol('USD')
        '$'
        >>> get_currency_symbol('EUR')
        '€'
    """
    if not currency_code:
        return '$'

    return CURRENCY_SYMBOLS.get(currency_code.upper(), currency_code)


def get_supported_countries():
    """
    Get list of all supported country codes

    Returns:
        List of ISO country codes
    """
    return list(COUNTRY_TO_CURRENCY.keys())


def get_supported_currencies():
    """
    Get list of all supported currencies

    Returns:
        List of unique currency codes
    """
    return list(set(COUNTRY_TO_CURRENCY.values()))


def is_country_supported(country_code: str) -> bool:
    """
    Check if a country code is supported

    Args:
        country_code: ISO country code

    Returns:
        True if country is supported, False otherwise
    """
    if not country_code:
        return False
    return country_code.upper().strip() in COUNTRY_TO_CURRENCY


# Export main function
__all__ = [
    'get_currency_from_country',
    'get_currency_symbol',
    'get_supported_countries',
    'get_supported_currencies',
    'is_country_supported',
    'COUNTRY_TO_CURRENCY',
    'CURRENCY_SYMBOLS'
]
