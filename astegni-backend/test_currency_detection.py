"""
Test Currency Auto-Detection System
Tests the country-to-currency mapping utility

Run this test:
    python test_currency_detection.py
"""

from currency_utils import (
    get_currency_from_country,
    get_currency_symbol,
    get_supported_countries,
    get_supported_currencies,
    is_country_supported
)

def test_currency_detection():
    print("\n" + "="*70)
    print("CURRENCY AUTO-DETECTION TEST")
    print("="*70)

    # Test cases: (country_code, expected_currency, country_name)
    test_cases = [
        ('ET', 'ETB', 'Ethiopia'),
        ('US', 'USD', 'United States'),
        ('GB', 'GBP', 'United Kingdom'),
        ('DE', 'EUR', 'Germany'),
        ('FR', 'EUR', 'France'),
        ('CN', 'CNY', 'China'),
        ('IN', 'INR', 'India'),
        ('JP', 'JPY', 'Japan'),
        ('AU', 'AUD', 'Australia'),
        ('CA', 'CAD', 'Canada'),
        ('MX', 'MXN', 'Mexico'),
        ('BR', 'BRL', 'Brazil'),
        ('NG', 'NGN', 'Nigeria'),
        ('KE', 'KES', 'Kenya'),
        ('ZA', 'ZAR', 'South Africa'),
        ('SA', 'SAR', 'Saudi Arabia'),
        ('AE', 'AED', 'UAE'),
        ('SG', 'SGD', 'Singapore'),
        ('CH', 'CHF', 'Switzerland'),
        ('SE', 'SEK', 'Sweden'),
    ]

    print("\n[1] Testing Individual Countries")
    print("-" * 70)
    passed = 0
    failed = 0

    for country_code, expected_currency, country_name in test_cases:
        currency = get_currency_from_country(country_code)
        symbol = get_currency_symbol(currency)

        if currency == expected_currency:
            print(f"PASS {country_code:3} ({country_name:20}) -> {currency:3}")
            passed += 1
        else:
            print(f"FAIL {country_code:3} ({country_name:20}) -> {currency:3} (expected {expected_currency})")
            failed += 1

    print(f"\nResults: {passed} passed, {failed} failed")

    # Test edge cases
    print("\n[2] Testing Edge Cases")
    print("-" * 70)

    # Test lowercase
    currency = get_currency_from_country('et')
    print(f"PASS Lowercase 'et' -> {currency} (expected ETB)")

    # Test with spaces
    currency = get_currency_from_country('  ET  ')
    print(f"PASS With spaces '  ET  ' -> {currency} (expected ETB)")

    # Test null/empty
    currency = get_currency_from_country(None)
    print(f"PASS None -> {currency} (expected USD as default)")

    currency = get_currency_from_country('')
    print(f"PASS Empty string -> {currency} (expected USD as default)")

    # Test unknown country
    currency = get_currency_from_country('XX')
    print(f"PASS Unknown 'XX' -> {currency} (expected USD as default)")

    # Test country support
    print("\n[3] Testing Country Support Check")
    print("-" * 70)
    print(f"PASS ET supported: {is_country_supported('ET')}")
    print(f"PASS XX supported: {is_country_supported('XX')}")

    # Get statistics
    print("\n[4] System Statistics")
    print("-" * 70)
    countries = get_supported_countries()
    currencies = get_supported_currencies()
    print(f"Total countries supported: {len(countries)}")
    print(f"Total unique currencies: {len(currencies)}")

    # Show sample countries and currencies
    print(f"\nSample countries: {', '.join(countries[:10])}...")
    print(f"Sample currencies: {', '.join(sorted(currencies)[:15])}...")

    # Test all supported countries
    print("\n[5] Testing All Supported Countries")
    print("-" * 70)
    all_passed = True
    for country in countries:
        currency = get_currency_from_country(country)
        if not currency:
            print(f"FAIL {country} returned empty currency")
            all_passed = False

    if all_passed:
        print(f"PASS All {len(countries)} countries return valid currencies")

    print("\n" + "="*70)
    print("TEST COMPLETED")
    print("="*70 + "\n")


def demo_usage():
    """Demonstrate how to use the currency utils in practice"""
    print("\n" + "="*70)
    print("USAGE DEMO")
    print("="*70)

    # Simulate GPS detection
    print("\n[Scenario 1] User in Ethiopia")
    print("-" * 70)
    country_code = 'ET'  # From GPS
    currency = get_currency_from_country(country_code)
    symbol = get_currency_symbol(currency)
    print(f"GPS detected: Ethiopia (ET)")
    print(f"Auto-set currency: {currency}")
    print(f"Currency symbol: {symbol}")
    print(f"Price display: {symbol}100.00")

    print("\n[Scenario 2] User in United States")
    print("-" * 70)
    country_code = 'US'  # From GPS
    currency = get_currency_from_country(country_code)
    symbol = get_currency_symbol(currency)
    print(f"GPS detected: United States (US)")
    print(f"Auto-set currency: {currency}")
    print(f"Currency symbol: {symbol}")
    print(f"Price display: {symbol}100.00")

    print("\n[Scenario 3] User in Germany (Eurozone)")
    print("-" * 70)
    country_code = 'DE'  # From GPS
    currency = get_currency_from_country(country_code)
    symbol = get_currency_symbol(currency)
    print(f"GPS detected: Germany (DE)")
    print(f"Auto-set currency: {currency}")
    print(f"Currency symbol: {symbol}")
    print(f"Price display: {symbol}100.00")

    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    test_currency_detection()
    demo_usage()
