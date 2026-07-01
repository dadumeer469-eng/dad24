import re

with open('/tmp/vite_dump.bin', 'rb') as f:
    data = f.read()

# We are looking for the AdminPanel code. It should be a long string of JS/TS.
# Let's search for something that was ONLY in the old AdminPanel.
# "Manage Food Categories" or "Financial Coordinates"
idx = data.find(b'Financial Coordinates')
if idx != -1:
    print(f"Found 'Financial Coordinates' at {idx}")
    # Let's extract 500000 bytes around it
    start = max(0, idx - 50000)
    end = min(len(data), idx + 350000)
    with open('/tmp/admin_panel_snippet.txt', 'wb') as out:
        out.write(data[start:end])
else:
    print("Not found.")
