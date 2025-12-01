"""
Check DNS records for email authentication
"""
import dns.resolver
import sys

def check_spf_record(domain):
    """Check SPF record"""
    print(f"\n{'='*60}")
    print(f"Checking SPF record for {domain}")
    print(f"{'='*60}")

    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        spf_found = False

        for rdata in answers:
            txt_string = str(rdata).strip('"')
            if txt_string.startswith('v=spf1'):
                spf_found = True
                print(f"✓ SPF Record Found:")
                print(f"  {txt_string}")

                if 'include:_spf.google.com' in txt_string:
                    print(f"\n✓ Google SPF included - CORRECT!")
                else:
                    print(f"\n✗ Google SPF not included")
                break

        if not spf_found:
            print(f"✗ No SPF record found")
            return False

        return True

    except Exception as e:
        print(f"✗ Error checking SPF: {str(e)}")
        return False

def check_dkim_record(domain, selector='google'):
    """Check DKIM record"""
    print(f"\n{'='*60}")
    print(f"Checking DKIM record for {domain}")
    print(f"{'='*60}")

    dkim_domain = f"{selector}._domainkey.{domain}"

    try:
        answers = dns.resolver.resolve(dkim_domain, 'TXT')
        dkim_found = False

        for rdata in answers:
            txt_string = str(rdata).strip('"')
            if 'v=DKIM1' in txt_string:
                dkim_found = True
                print(f"✓ DKIM Record Found:")
                print(f"  Host: {selector}._domainkey")
                print(f"  Value: {txt_string[:100]}...")

                if 'k=rsa' in txt_string and 'p=' in txt_string:
                    print(f"\n✓ DKIM format is correct!")
                else:
                    print(f"\n✗ DKIM format issue")
                break

        if not dkim_found:
            print(f"✗ No DKIM record found")
            return False

        return True

    except Exception as e:
        print(f"✗ Error checking DKIM: {str(e)}")
        print(f"  (This is normal if DNS hasn't propagated yet)")
        return False

def check_mx_records(domain):
    """Check MX records"""
    print(f"\n{'='*60}")
    print(f"Checking MX records for {domain}")
    print(f"{'='*60}")

    try:
        answers = dns.resolver.resolve(domain, 'MX')
        mx_found = False
        google_mx = False

        print("✓ MX Records Found:")
        for rdata in answers:
            print(f"  Priority {rdata.preference}: {rdata.exchange}")
            mx_found = True
            if 'google.com' in str(rdata.exchange).lower():
                google_mx = True

        if google_mx:
            print(f"\n✓ Google MX records configured - CORRECT!")
        else:
            print(f"\n✗ Google MX records not found")

        return mx_found

    except Exception as e:
        print(f"✗ Error checking MX: {str(e)}")
        return False

def main():
    domain = "astegni.com"

    print("\n" + "="*60)
    print("DNS Email Authentication Check")
    print(f"Domain: {domain}")
    print("="*60)

    spf_ok = check_spf_record(domain)
    dkim_ok = check_dkim_record(domain, 'google')
    mx_ok = check_mx_records(domain)

    print("\n" + "="*60)
    print("Summary")
    print("="*60)
    print(f"SPF Record:  {'✓ PASS' if spf_ok else '✗ FAIL or NOT PROPAGATED'}")
    print(f"DKIM Record: {'✓ PASS' if dkim_ok else '✗ FAIL or NOT PROPAGATED'}")
    print(f"MX Records:  {'✓ PASS' if mx_ok else '✗ FAIL'}")

    if spf_ok and dkim_ok and mx_ok:
        print("\n🎉 All DNS records configured correctly!")
        print("Emails should now be authenticated and delivered.")
    elif spf_ok or dkim_ok:
        print("\n⏳ Some records found - DNS may still be propagating...")
        print("Wait 1-2 hours and check again.")
    else:
        print("\n⏳ DNS records not found yet - still propagating...")
        print("This is normal - DNS changes take 15 minutes to 2 hours.")
        print("Run this script again in 30 minutes.")

    print("\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCheck cancelled.")
        sys.exit(0)
