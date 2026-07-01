with open('/tmp/admin_panel_snippet.txt', 'rb') as f:
    data = f.read()

start_marker = b'import React, { useState'
start_idx = data.find(start_marker)

if start_idx == -1:
    print("Start marker not found")
else:
    print(f"Start index: {start_idx}")
    end_marker = b'export default function AdminPanel'
    end_idx = data.find(end_marker, start_idx)
    print(f"End index: {end_idx}")
    
    with open('/tmp/recovered.tsx', 'wb') as out:
        out.write(data[start_idx:start_idx+350000])
