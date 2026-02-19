"""
Currency Utilities for Astegni Platform
Provides country code to currency mapping for automatic currency detection

Usage:
    from currency_utils import get_currency_from_country

    currency = get_currency_from_country('ET')  # Returns 'ETB'
    currency = get_currency_from_country('US')  # Returns 'USD'
"""

# Comprehensive country code to currency mapping
# Covers all 195 UN-recognized countries worldwide
COUNTRY_TO_CURRENCY = {
    # Africa (54 countries)
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
    'SN': 'XOF',  # Senegal - West African CFA Franc
    'CI': 'XOF',  # Ivory Coast - West African CFA Franc
    'CM': 'XAF',  # Cameroon - Central African CFA Franc
    'AO': 'AOA',  # Angola - Angolan Kwanza
    'BW': 'BWP',  # Botswana - Botswana Pula
    'MU': 'MUR',  # Mauritius - Mauritian Rupee
    'ZM': 'ZMW',  # Zambia - Zambian Kwacha
    'ZW': 'ZWL',  # Zimbabwe - Zimbabwean Dollar
    'MW': 'MWK',  # Malawi - Malawian Kwacha
    'MZ': 'MZN',  # Mozambique - Mozambican Metical
    'NA': 'NAD',  # Namibia - Namibian Dollar
    'BJ': 'XOF',  # Benin - West African CFA Franc
    'BF': 'XOF',  # Burkina Faso - West African CFA Franc
    'ML': 'XOF',  # Mali - West African CFA Franc
    'NE': 'XOF',  # Niger - West African CFA Franc
    'TG': 'XOF',  # Togo - West African CFA Franc
    'GN': 'GNF',  # Guinea - Guinean Franc
    'LR': 'LRD',  # Liberia - Liberian Dollar
    'SL': 'SLE',  # Sierra Leone - Sierra Leonean Leone
    'GM': 'GMD',  # Gambia - Gambian Dalasi
    'SD': 'SDG',  # Sudan - Sudanese Pound
    'SS': 'SSP',  # South Sudan - South Sudanese Pound
    'SO': 'SOS',  # Somalia - Somali Shilling
    'DJ': 'DJF',  # Djibouti - Djiboutian Franc
    'ER': 'ERN',  # Eritrea - Eritrean Nakfa
    'LY': 'LYD',  # Libya - Libyan Dinar
    'MR': 'MRU',  # Mauritania - Mauritanian Ouguiya
    'CV': 'CVE',  # Cape Verde - Cape Verdean Escudo
    'ST': 'STN',  # São Tomé and Príncipe - São Tomé Dobra
    'GQ': 'XAF',  # Equatorial Guinea - Central African CFA Franc
    'GA': 'XAF',  # Gabon - Central African CFA Franc
    'CG': 'XAF',  # Congo (Republic) - Central African CFA Franc
    'CD': 'CDF',  # Congo (DRC) - Congolese Franc
    'CF': 'XAF',  # Central African Republic - Central African CFA Franc
    'TD': 'XAF',  # Chad - Central African CFA Franc
    'BI': 'BIF',  # Burundi - Burundian Franc
    'KM': 'KMF',  # Comoros - Comorian Franc
    'MG': 'MGA',  # Madagascar - Malagasy Ariary
    'SC': 'SCR',  # Seychelles - Seychellois Rupee
    'LS': 'LSL',  # Lesotho - Lesotho Loti
    'SZ': 'SZL',  # Eswatini - Swazi Lilangeni
    'GW': 'XOF',  # Guinea-Bissau - West African CFA Franc

    # Americas (35 countries)
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
    'GY': 'GYD',  # Guyana - Guyanese Dollar
    'SR': 'SRD',  # Suriname - Surinamese Dollar
    'BZ': 'BZD',  # Belize - Belize Dollar
    'LC': 'XCD',  # Saint Lucia - East Caribbean Dollar
    'VC': 'XCD',  # Saint Vincent and the Grenadines - East Caribbean Dollar
    'GD': 'XCD',  # Grenada - East Caribbean Dollar
    'AG': 'XCD',  # Antigua and Barbuda - East Caribbean Dollar
    'DM': 'XCD',  # Dominica - East Caribbean Dollar
    'KN': 'XCD',  # Saint Kitts and Nevis - East Caribbean Dollar

    # Europe (44 countries)
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
    'BA': 'BAM',  # Bosnia and Herzegovina - Bosnian Mark
    'ME': 'EUR',  # Montenegro - Euro
    'XK': 'EUR',  # Kosovo - Euro
    'LU': 'EUR',  # Luxembourg - Euro
    'MT': 'EUR',  # Malta - Euro
    'CY': 'EUR',  # Cyprus - Euro
    'LI': 'CHF',  # Liechtenstein - Swiss Franc
    'MC': 'EUR',  # Monaco - Euro
    'SM': 'EUR',  # San Marino - Euro
    'VA': 'EUR',  # Vatican City - Euro
    'AD': 'EUR',  # Andorra - Euro

    # Asia (48 countries)
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
    'KP': 'KPW',  # North Korea - North Korean Won
    'TL': 'USD',  # Timor-Leste - US Dollar
    'BN': 'BND',  # Brunei - Brunei Dollar
    'GE': 'GEL',  # Georgia - Georgian Lari
    'AM': 'AMD',  # Armenia - Armenian Dram
    'AZ': 'AZN',  # Azerbaijan - Azerbaijani Manat

    # Middle East (14 countries)
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

    # Oceania (14 countries)
    'AU': 'AUD',  # Australia - Australian Dollar
    'NZ': 'NZD',  # New Zealand - New Zealand Dollar
    'PG': 'PGK',  # Papua New Guinea - Papua New Guinean Kina
    'FJ': 'FJD',  # Fiji - Fijian Dollar
    'SB': 'SBD',  # Solomon Islands - Solomon Islands Dollar
    'VU': 'VUV',  # Vanuatu - Vanuatu Vatu
    'WS': 'WST',  # Samoa - Samoan Tala
    'TO': 'TOP',  # Tonga - Tongan Paʻanga
    'KI': 'AUD',  # Kiribati - Australian Dollar
    'FM': 'USD',  # Micronesia - US Dollar
    'MH': 'USD',  # Marshall Islands - US Dollar
    'PW': 'USD',  # Palau - US Dollar
    'NR': 'AUD',  # Nauru - Australian Dollar
    'TV': 'AUD',  # Tuvalu - Australian Dollar

    # Territories & Dependencies (commonly used)
    'PR': 'USD',  # Puerto Rico - US Dollar
    'VI': 'USD',  # US Virgin Islands - US Dollar
    'GU': 'USD',  # Guam - US Dollar
    'AS': 'USD',  # American Samoa - US Dollar
    'MP': 'USD',  # Northern Mariana Islands - US Dollar
    'GF': 'EUR',  # French Guiana - Euro
    'GP': 'EUR',  # Guadeloupe - Euro
    'MQ': 'EUR',  # Martinique - Euro
    'RE': 'EUR',  # Réunion - Euro
    'YT': 'EUR',  # Mayotte - Euro
    'NC': 'XPF',  # New Caledonia - CFP Franc
    'PF': 'XPF',  # French Polynesia - CFP Franc
    'WF': 'XPF',  # Wallis and Futuna - CFP Franc
    'PM': 'EUR',  # Saint Pierre and Miquelon - Euro
    'MF': 'EUR',  # Saint Martin - Euro
    'BL': 'EUR',  # Saint Barthélemy - Euro
    'AW': 'AWG',  # Aruba - Aruban Florin
    'CW': 'ANG',  # Curaçao - Netherlands Antillean Guilder
    'SX': 'ANG',  # Sint Maarten - Netherlands Antillean Guilder
    'BQ': 'USD',  # Bonaire - US Dollar
    'TC': 'USD',  # Turks and Caicos - US Dollar
    'KY': 'KYD',  # Cayman Islands - Cayman Islands Dollar
    'BM': 'BMD',  # Bermuda - Bermudian Dollar
    'VG': 'USD',  # British Virgin Islands - US Dollar
    'MS': 'XCD',  # Montserrat - East Caribbean Dollar
    'AI': 'XCD',  # Anguilla - East Caribbean Dollar
    'FK': 'FKP',  # Falkland Islands - Falkland Islands Pound
    'GI': 'GIP',  # Gibraltar - Gibraltar Pound
    'JE': 'GBP',  # Jersey - British Pound
    'GG': 'GBP',  # Guernsey - British Pound
    'IM': 'GBP',  # Isle of Man - British Pound
    'SH': 'SHP',  # Saint Helena - Saint Helena Pound
    'IO': 'USD',  # British Indian Ocean Territory - US Dollar
    'CK': 'NZD',  # Cook Islands - New Zealand Dollar
    'NU': 'NZD',  # Niue - New Zealand Dollar
    'TK': 'NZD',  # Tokelau - New Zealand Dollar
    'PN': 'NZD',  # Pitcairn Islands - New Zealand Dollar
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
    'NZD': 'NZ$',
    'BRL': 'R$',
    'MXN': '$',
    'CHF': 'CHF',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'ISK': 'kr',
    'TRY': '₺',
    'RUB': '₽',
    'KRW': '₩',
    'KPW': '₩',
    'SAR': '﷼',
    'AED': 'د.إ',
    'ILS': '₪',
    'THB': '฿',
    'VND': '₫',
    'PHP': '₱',
    'IDR': 'Rp',
    'PKR': '₨',
    'BDT': '৳',
    'LKR': '₨',
    'NPR': '₨',
    'MYR': 'RM',
    'SGD': 'S$',
    'HKD': 'HK$',
    'TWD': 'NT$',
    'CNY': '¥',
    'KZT': '₸',
    'UAH': '₴',
    'PLN': 'zł',
    'HUF': 'Ft',
    'CZK': 'Kč',
    'RON': 'lei',
    'BGN': 'лв',
    'HRK': 'kn',
    'RSD': 'din',
    'TZS': 'TSh',
    'UGX': 'USh',
    'RWF': 'RF',
    'MAD': 'MAD',
    'DZD': 'DA',
    'TND': 'DT',
    'SDG': 'SDG',
    'LYD': 'LD',
    'IQD': 'IQD',
    'IRR': '﷼',
    'JOD': 'JD',
    'KWD': 'KD',
    'LBP': 'L£',
    'OMR': 'OMR',
    'QAR': 'QR',
    'BHD': 'BD',
    'YER': '﷼',
    'SYP': 'S£',
    'GEL': '₾',
    'AMD': '֏',
    'AZN': '₼',
    'XOF': 'CFA',
    'XAF': 'FCFA',
    'XCD': 'EC$',
    'XPF': 'CFP',
    'AOA': 'Kz',
    'BWP': 'P',
    'MUR': '₨',
    'ZMW': 'ZK',
    'ZWL': 'Z$',
    'MWK': 'MK',
    'MZN': 'MT',
    'NAD': 'N$',
    'GNF': 'FG',
    'LRD': 'L$',
    'SLE': 'Le',
    'GMD': 'D',
    'SSP': 'SSP',
    'SOS': 'Sh',
    'DJF': 'Fdj',
    'ERN': 'Nfk',
    'MRU': 'UM',
    'CVE': '$',
    'STN': 'Db',
    'CDF': 'FC',
    'BIF': 'Fr',
    'KMF': 'Fr',
    'MGA': 'Ar',
    'SCR': '₨',
    'LSL': 'L',
    'SZL': 'L',
    'ARS': '$',
    'COP': '$',
    'CLP': '$',
    'PEN': 'S/',
    'VES': 'Bs.',
    'BOB': 'Bs.',
    'PYG': '₲',
    'UYU': '$',
    'CRC': '₡',
    'PAB': 'B/.',
    'GTQ': 'Q',
    'HNL': 'L',
    'NIO': 'C$',
    'DOP': 'RD$',
    'JMD': 'J$',
    'TTD': 'TT$',
    'BBD': 'Bds$',
    'BSD': 'B$',
    'HTG': 'G',
    'CUP': '$',
    'GYD': 'G$',
    'SRD': '$',
    'BZD': 'BZ$',
    'AFN': '؋',
    'KHR': '៛',
    'LAK': '₭',
    'MMK': 'K',
    'BTN': 'Nu',
    'MVR': 'Rf',
    'UZS': 'so\'m',
    'TMT': 'T',
    'KGS': 'с',
    'TJS': 'SM',
    'MNT': '₮',
    'MOP': 'P',
    'KYD': 'CI$',
    'BMD': 'BD$',
    'AWG': 'ƒ',
    'ANG': 'ƒ',
    'FKP': '£',
    'GIP': '£',
    'SHP': '£',
    'BND': 'B$',
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
    # Africa
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
    "ivory coast": 'CI', "côte d'ivoire": 'CI', 'cote divoire': 'CI', "cote d'ivoire": 'CI',
    'morocco': 'MA', 'moroccan': 'MA',
    'algeria': 'DZ', 'algerian': 'DZ',
    'tunisia': 'TN', 'tunisian': 'TN',
    'sudan': 'SD', 'sudanese': 'SD',
    'south sudan': 'SS', 'south sudanese': 'SS',
    'somalia': 'SO', 'somali': 'SO',
    'djibouti': 'DJ', 'djiboutian': 'DJ',
    'eritrea': 'ER', 'eritrean': 'ER',
    'libya': 'LY', 'libyan': 'LY',
    'mauritania': 'MR', 'mauritanian': 'MR',
    'cape verde': 'CV', 'cabo verde': 'CV',
    'sao tome and principe': 'ST', 'são tomé and príncipe': 'ST',
    'equatorial guinea': 'GQ',
    'gabon': 'GA', 'gabonese': 'GA',
    'congo': 'CG', 'republic of the congo': 'CG',
    'democratic republic of the congo': 'CD', 'drc': 'CD', 'dr congo': 'CD',
    'central african republic': 'CF',
    'chad': 'TD', 'chadian': 'TD',
    'burundi': 'BI', 'burundian': 'BI',
    'comoros': 'KM', 'comorian': 'KM',
    'madagascar': 'MG', 'malagasy': 'MG',
    'seychelles': 'SC',
    'lesotho': 'LS', 'basotho': 'LS',
    'eswatini': 'SZ', 'swaziland': 'SZ',
    'angola': 'AO', 'angolan': 'AO',
    'botswana': 'BW',
    'mauritius': 'MU', 'mauritian': 'MU',
    'zambia': 'ZM', 'zambian': 'ZM',
    'zimbabwe': 'ZW', 'zimbabwean': 'ZW',
    'malawi': 'MW', 'malawian': 'MW',
    'mozambique': 'MZ', 'mozambican': 'MZ',
    'namibia': 'NA', 'namibian': 'NA',
    'benin': 'BJ', 'beninese': 'BJ',
    'burkina faso': 'BF',
    'mali': 'ML', 'malian': 'ML',
    'niger': 'NE', 'nigerien': 'NE',
    'togo': 'TG', 'togolese': 'TG',
    'guinea': 'GN', 'guinean': 'GN',
    'liberia': 'LR', 'liberian': 'LR',
    'sierra leone': 'SL',
    'gambia': 'GM', 'gambian': 'GM',
    'guinea-bissau': 'GW',

    # Americas
    'united states': 'US', 'usa': 'US', 'united states of america': 'US', 'america': 'US',
    'canada': 'CA', 'canadian': 'CA',
    'mexico': 'MX', 'mexican': 'MX',
    'brazil': 'BR', 'brazilian': 'BR',
    'argentina': 'AR', 'argentinian': 'AR', 'argentine': 'AR',
    'colombia': 'CO', 'colombian': 'CO',
    'chile': 'CL', 'chilean': 'CL',
    'peru': 'PE', 'peruvian': 'PE',
    'venezuela': 'VE', 'venezuelan': 'VE',
    'ecuador': 'EC', 'ecuadorian': 'EC',
    'bolivia': 'BO', 'bolivian': 'BO',
    'paraguay': 'PY', 'paraguayan': 'PY',
    'uruguay': 'UY', 'uruguayan': 'UY',
    'costa rica': 'CR', 'costa rican': 'CR',
    'panama': 'PA', 'panamanian': 'PA',
    'guatemala': 'GT', 'guatemalan': 'GT',
    'honduras': 'HN', 'honduran': 'HN',
    'nicaragua': 'NI', 'nicaraguan': 'NI',
    'el salvador': 'SV', 'salvadoran': 'SV',
    'dominican republic': 'DO',
    'jamaica': 'JM', 'jamaican': 'JM',
    'trinidad and tobago': 'TT', 'trinidadian': 'TT',
    'barbados': 'BB', 'barbadian': 'BB',
    'bahamas': 'BS', 'bahamian': 'BS',
    'haiti': 'HT', 'haitian': 'HT',
    'cuba': 'CU', 'cuban': 'CU',
    'guyana': 'GY', 'guyanese': 'GY',
    'suriname': 'SR', 'surinamese': 'SR',
    'belize': 'BZ', 'belizean': 'BZ',
    'saint lucia': 'LC',
    'saint vincent and the grenadines': 'VC',
    'grenada': 'GD', 'grenadian': 'GD',
    'antigua and barbuda': 'AG',
    'dominica': 'DM', 'dominican': 'DM',
    'saint kitts and nevis': 'KN',

    # Europe
    'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
    'scotland': 'GB', 'wales': 'GB', 'northern ireland': 'GB',
    'germany': 'DE', 'german': 'DE',
    'france': 'FR', 'french': 'FR',
    'italy': 'IT', 'italian': 'IT',
    'spain': 'ES', 'spanish': 'ES',
    'netherlands': 'NL', 'dutch': 'NL', 'holland': 'NL',
    'belgium': 'BE', 'belgian': 'BE',
    'austria': 'AT', 'austrian': 'AT',
    'portugal': 'PT', 'portuguese': 'PT',
    'ireland': 'IE', 'irish': 'IE',
    'greece': 'GR', 'greek': 'GR',
    'finland': 'FI', 'finnish': 'FI',
    'sweden': 'SE', 'swedish': 'SE',
    'norway': 'NO', 'norwegian': 'NO',
    'denmark': 'DK', 'danish': 'DK',
    'switzerland': 'CH', 'swiss': 'CH',
    'poland': 'PL', 'polish': 'PL',
    'czech republic': 'CZ', 'czechia': 'CZ', 'czech': 'CZ',
    'hungary': 'HU', 'hungarian': 'HU',
    'romania': 'RO', 'romanian': 'RO',
    'bulgaria': 'BG', 'bulgarian': 'BG',
    'croatia': 'HR', 'croatian': 'HR',
    'serbia': 'RS', 'serbian': 'RS',
    'slovakia': 'SK', 'slovak': 'SK',
    'slovenia': 'SI', 'slovenian': 'SI',
    'lithuania': 'LT', 'lithuanian': 'LT',
    'latvia': 'LV', 'latvian': 'LV',
    'estonia': 'EE', 'estonian': 'EE',
    'iceland': 'IS', 'icelandic': 'IS',
    'ukraine': 'UA', 'ukrainian': 'UA',
    'turkey': 'TR', 'turkish': 'TR', 'turkiye': 'TR',
    'russia': 'RU', 'russian': 'RU',
    'belarus': 'BY', 'belarusian': 'BY',
    'moldova': 'MD', 'moldovan': 'MD',
    'albania': 'AL', 'albanian': 'AL',
    'north macedonia': 'MK', 'macedonian': 'MK',
    'bosnia and herzegovina': 'BA', 'bosnia': 'BA',
    'montenegro': 'ME', 'montenegrin': 'ME',
    'kosovo': 'XK',
    'luxembourg': 'LU', 'luxembourgish': 'LU',
    'malta': 'MT', 'maltese': 'MT',
    'cyprus': 'CY', 'cypriot': 'CY',
    'liechtenstein': 'LI',
    'monaco': 'MC', 'monégasque': 'MC',
    'san marino': 'SM',
    'vatican': 'VA', 'holy see': 'VA',
    'andorra': 'AD', 'andorran': 'AD',

    # Asia
    'china': 'CN', 'chinese': 'CN',
    'india': 'IN', 'indian': 'IN',
    'japan': 'JP', 'japanese': 'JP',
    'south korea': 'KR', 'korea': 'KR', 'korean': 'KR',
    'north korea': 'KP',
    'singapore': 'SG', 'singaporean': 'SG',
    'malaysia': 'MY', 'malaysian': 'MY',
    'thailand': 'TH', 'thai': 'TH',
    'vietnam': 'VN', 'vietnamese': 'VN',
    'philippines': 'PH', 'philippine': 'PH', 'filipino': 'PH',
    'indonesia': 'ID', 'indonesian': 'ID',
    'pakistan': 'PK', 'pakistani': 'PK',
    'bangladesh': 'BD', 'bangladeshi': 'BD',
    'sri lanka': 'LK', 'sri lankan': 'LK',
    'myanmar': 'MM', 'burmese': 'MM', 'burma': 'MM',
    'cambodia': 'KH', 'cambodian': 'KH',
    'laos': 'LA', 'lao': 'LA',
    'nepal': 'NP', 'nepalese': 'NP', 'nepali': 'NP',
    'bhutan': 'BT', 'bhutanese': 'BT',
    'maldives': 'MV', 'maldivian': 'MV',
    'afghanistan': 'AF', 'afghan': 'AF',
    'kazakhstan': 'KZ', 'kazakh': 'KZ',
    'uzbekistan': 'UZ', 'uzbek': 'UZ',
    'turkmenistan': 'TM', 'turkmen': 'TM',
    'kyrgyzstan': 'KG', 'kyrgyz': 'KG',
    'tajikistan': 'TJ', 'tajik': 'TJ',
    'mongolia': 'MN', 'mongolian': 'MN',
    'hong kong': 'HK',
    'macau': 'MO', 'macao': 'MO',
    'taiwan': 'TW', 'taiwanese': 'TW',
    'timor-leste': 'TL', 'east timor': 'TL',
    'brunei': 'BN', 'bruneian': 'BN',
    'georgia': 'GE', 'georgian': 'GE',
    'armenia': 'AM', 'armenian': 'AM',
    'azerbaijan': 'AZ', 'azerbaijani': 'AZ',

    # Middle East
    'saudi arabia': 'SA', 'saudi': 'SA',
    'uae': 'AE', 'united arab emirates': 'AE', 'emirates': 'AE',
    'israel': 'IL', 'israeli': 'IL',
    'iraq': 'IQ', 'iraqi': 'IQ',
    'iran': 'IR', 'iranian': 'IR',
    'jordan': 'JO', 'jordanian': 'JO',
    'kuwait': 'KW', 'kuwaiti': 'KW',
    'lebanon': 'LB', 'lebanese': 'LB',
    'oman': 'OM', 'omani': 'OM',
    'qatar': 'QA', 'qatari': 'QA',
    'bahrain': 'BH', 'bahraini': 'BH',
    'yemen': 'YE', 'yemeni': 'YE',
    'syria': 'SY', 'syrian': 'SY',
    'palestine': 'PS', 'palestinian': 'PS',

    # Oceania
    'australia': 'AU', 'australian': 'AU',
    'new zealand': 'NZ', 'new zealander': 'NZ',
    'papua new guinea': 'PG',
    'fiji': 'FJ', 'fijian': 'FJ',
    'solomon islands': 'SB',
    'vanuatu': 'VU',
    'samoa': 'WS', 'samoan': 'WS',
    'tonga': 'TO', 'tongan': 'TO',
    'kiribati': 'KI',
    'micronesia': 'FM',
    'marshall islands': 'MH',
    'palau': 'PW',
    'nauru': 'NR', 'nauruan': 'NR',
    'tuvalu': 'TV', 'tuvaluan': 'TV',
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
