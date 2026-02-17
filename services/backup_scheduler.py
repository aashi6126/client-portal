"""
Backup Scheduler - Exports data to Excel at 12 AM and 12 PM daily.

Calls the running API's /api/export endpoint and saves the spreadsheet
to the backups/ directory with a timestamp.
"""

import os
import time
import logging
import urllib.request
from datetime import datetime, timedelta

# Configuration (all overridable via environment variables)
API_PORT = os.environ.get('API_PORT', '5000')
API_URL = os.environ.get('BACKUP_API_URL', f'http://127.0.0.1:{API_PORT}/api/export')
BACKUP_DIR = os.environ.get('BACKUP_DIR',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backups'))
MAX_BACKUPS = int(os.environ.get('BACKUP_MAX_COUNT', '30'))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [BACKUP] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)


def ensure_backup_dir():
    """Create backups directory if it doesn't exist."""
    os.makedirs(BACKUP_DIR, exist_ok=True)


def cleanup_old_backups():
    """Remove old backups, keeping only the most recent MAX_BACKUPS files."""
    try:
        files = sorted(
            [f for f in os.listdir(BACKUP_DIR) if f.endswith('.xlsx')],
            key=lambda f: os.path.getmtime(os.path.join(BACKUP_DIR, f)),
            reverse=True
        )
        for old_file in files[MAX_BACKUPS:]:
            os.remove(os.path.join(BACKUP_DIR, old_file))
            logging.info(f"Removed old backup: {old_file}")
    except Exception as e:
        logging.error(f"Error cleaning up old backups: {e}")


def run_backup():
    """Download export from API and save to backups directory."""
    ensure_backup_dir()
    timestamp = datetime.now().strftime('%Y-%m-%d_%H%M')
    filename = f"Client_Data_Backup_{timestamp}.xlsx"
    filepath = os.path.join(BACKUP_DIR, filename)

    try:
        logging.info("Starting scheduled backup...")
        req = urllib.request.Request(API_URL)
        with urllib.request.urlopen(req, timeout=60) as response:
            data = response.read()

        with open(filepath, 'wb') as f:
            f.write(data)

        size_kb = len(data) / 1024
        logging.info(f"Backup saved: {filename} ({size_kb:.1f} KB)")
        cleanup_old_backups()
    except Exception as e:
        logging.error(f"Backup failed: {e}")


def get_next_run_time():
    """Calculate seconds until the next 12:00 AM or 12:00 PM."""
    now = datetime.now()
    today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_noon = now.replace(hour=12, minute=0, second=0, microsecond=0)

    candidates = [today_midnight, today_noon]
    # Also consider tomorrow's midnight
    tomorrow_midnight = today_midnight + timedelta(days=1)
    candidates.append(tomorrow_midnight)

    future = [t for t in candidates if t > now]
    next_time = min(future)
    wait_seconds = (next_time - now).total_seconds()
    return next_time, wait_seconds


def main():
    logging.info("Backup scheduler started")
    logging.info(f"Backups will be saved to: {os.path.abspath(BACKUP_DIR)}")
    logging.info(f"Schedule: 12:00 AM and 12:00 PM daily")

    while True:
        next_time, wait_seconds = get_next_run_time()
        logging.info(f"Next backup at {next_time.strftime('%Y-%m-%d %I:%M %p')} "
                     f"(in {wait_seconds/3600:.1f} hours)")
        time.sleep(wait_seconds)
        run_backup()


if __name__ == '__main__':
    main()
