#!/var/www/astegni/astegni-backend/venv/bin/python
"""
Astegni database backup -> Backblaze B2.

Routing (GFS):
  - Every run uploads to daily/    (lifecycle: hidden at 7d, deleted at 8d)
  - On Sundays                also  uploads to weekly/   (hidden at 28d)
  - On the 1st of the month   also  uploads to monthly/  (hidden at 180d)

Local copies under /var/backups/astegni/ are kept for 7 days (just-in-case
fast restore without hitting B2).

Invocation:
  /usr/local/bin/astegni-backup.py           # normal run
  /usr/local/bin/astegni-backup.py --dry-run # dump locally but skip upload
"""
import argparse
import datetime as dt
import gzip
import os
import shutil
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv
from b2sdk.v2 import InMemoryAccountInfo, B2Api

ENV_PATH = "/var/www/astegni/astegni-backend/.env"
LOCAL_DIR = Path("/var/backups/astegni")
LOCAL_KEEP_DAYS = 7
DATABASES = ["astegni_user_db", "astegni_admin_db"]


def _utcnow():
    return dt.datetime.now(dt.timezone.utc)


def log(msg):
    now = _utcnow().replace(tzinfo=None).isoformat(timespec='seconds')
    print('[{}Z] {}'.format(now, msg), flush=True)


def dump_database(name, out_gz):
    """pg_dump | gzip -> out_gz. Runs as the postgres OS user via sudo."""
    out_gz.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_gz.with_suffix(out_gz.suffix + ".partial")
    log('dumping {} -> {}'.format(name, out_gz.name))
    with open(tmp, "wb") as fh_out:
        dump = subprocess.Popen(
            ["sudo", "-u", "postgres", "pg_dump",
             "--format=plain", "--no-owner", name],
            stdout=subprocess.PIPE,
        )
        with gzip.GzipFile(fileobj=fh_out, mode="wb", compresslevel=6) as gz:
            shutil.copyfileobj(dump.stdout, gz)
        rc = dump.wait()
    if rc != 0:
        tmp.unlink(missing_ok=True)
        raise RuntimeError('pg_dump failed for {} (exit {})'.format(name, rc))
    tmp.rename(out_gz)
    size_mb = out_gz.stat().st_size / 1_048_576
    log('  wrote {} ({:.2f} MB)'.format(out_gz, size_mb))


def upload(api, bucket_name, local, remote_key):
    bucket = api.get_bucket_by_name(bucket_name)
    log('  uploading {} -> b2://{}/{}'.format(local.name, bucket_name, remote_key))
    bucket.upload_local_file(local_file=str(local), file_name=remote_key)


def routing_prefixes(today):
    prefixes = ["daily"]
    if today.weekday() == 6:  # Sunday
        prefixes.append("weekly")
    if today.day == 1:
        prefixes.append("monthly")
    return prefixes


def cleanup_local(retain_days):
    cutoff = dt.datetime.now() - dt.timedelta(days=retain_days)
    removed = 0
    for f in LOCAL_DIR.glob("*.sql.gz"):
        if dt.datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
            f.unlink()
            removed += 1
    log('local cleanup: removed {} file(s) older than {}d'.format(removed, retain_days))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="dump locally, skip upload")
    args = parser.parse_args()

    load_dotenv(ENV_PATH)
    key_id = os.getenv("BACKUP_B2_KEY_ID")
    app_key = os.getenv("BACKUP_B2_APPLICATION_KEY")
    bucket_name = os.getenv("BACKUP_B2_BUCKET")
    if not (key_id and app_key and bucket_name):
        log("ERROR: BACKUP_B2_KEY_ID/BACKUP_B2_APPLICATION_KEY/BACKUP_B2_BUCKET missing in .env")
        return 2

    today = dt.date.today()
    stamp = _utcnow().strftime("%Y%m%d-%H%M%SZ")
    prefixes = routing_prefixes(today)
    log('start; today={} prefixes={} dry_run={}'.format(today, prefixes, args.dry_run))

    LOCAL_DIR.mkdir(parents=True, exist_ok=True)

    dumps = []
    for db in DATABASES:
        out = LOCAL_DIR / '{}_{}.sql.gz'.format(db, stamp)
        dump_database(db, out)
        dumps.append((db, out))

    if args.dry_run:
        log("dry-run: skipping upload")
    else:
        api = B2Api(InMemoryAccountInfo())
        api.authorize_account("production", key_id, app_key)
        for db, local in dumps:
            for prefix in prefixes:
                upload(api, bucket_name, local, '{}/{}_{}.sql.gz'.format(prefix, db, stamp))

    cleanup_local(LOCAL_KEEP_DAYS)
    log("done")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as e:
        log('FATAL: command failed: {}'.format(e))
        sys.exit(1)
    except Exception as e:
        log('FATAL: {}: {}'.format(type(e).__name__, e))
        sys.exit(1)
