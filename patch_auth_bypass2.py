with open('src/App.tsx', 'r') as f:
    code = f.read()

old_code = """          const profileRef = doc(db, "users", phone);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.status === 'blocked' || data.isBlacklisted) {
              throw new Error("Yeh number register nahi ho sakta.");
            }
          }"""

new_code = """          const profileRef = doc(db, "users", phone);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.status === 'blocked' || data.isBlacklisted) {
              throw new Error("Yeh number register nahi ho sakta.");
            }
            if (data.role === 'admin' || data.role === 'rider') {
              throw new Error("Staff members must login via Staff Mode with a passcode.");
            }
          } else if (phone === "03277004471") {
            throw new Error("Staff members must login via Staff Mode with a passcode.");
          }"""

if old_code in code:
    code = code.replace(old_code, new_code)
    with open('src/App.tsx', 'w') as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Could not find old code in src/App.tsx")
