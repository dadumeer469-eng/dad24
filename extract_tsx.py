with open('/tmp/admin_panel_snippet.txt', 'rb') as f:
    data = f.read()

# Let's find the exact start
start_marker = b'import React, { useState, useEffect } from "react";'
start_idx = data.rfind(start_marker, 0, 50000)

if start_idx == -1:
    print("Start marker not found")
else:
    print(f"Start index: {start_idx}")
    
    # The end of the file is likely `  );\n}`
    # But it's better to just write everything from the start to the end of the snippet and then we'll clean it up manually.
    with open('/tmp/recovered_admin_panel.tsx', 'wb') as out:
        out.write(data[start_idx:])
