import os
import subprocess
import time

# Kill processes on port 8000
print("Finding processes on port 8000...")
result = subprocess.run('netstat -ano | findstr :8000', shell=True, capture_output=True, text=True)
pids = set()
for line in result.stdout.split('\n'):
    parts = line.strip().split()
    if len(parts) >= 5:
        pid = parts[-1]
        if pid.isdigit():
            pids.add(pid)

print(f"Found PIDs: {pids}")
for pid in pids:
    print(f"Killing PID {pid}...")
    subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)

print("Waiting 2 seconds...")
time.sleep(2)

print("Starting backend server...")
os.system('python app.py')
