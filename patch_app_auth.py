import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Find AuthModal
start = code.find('<AuthModal')
end = code.find('/>', start) + 2

new_auth = """<AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={async (inputValue, isStaffMode) => {
          let phone = inputValue;

          if (isStaffMode) {
            if (phone === "03277004471" || phone === "786786" || phone === "admin") {
              phone = "03277004471";
            }
            
            const profileRef = doc(db, "users", phone);
            const profileSnap = await getDoc(profileRef);
            
            if (profileSnap.exists()) {
              const role = profileSnap.data().role;
              if (role !== "admin" && role !== "rider") {
                throw new Error("Invalid Staff Pass Number.");
              }
            } else if (phone === "03277004471") {
               await setDoc(profileRef, {
                  uid: phone,
                  name: "meerali120",
                  phone: phone,
                  address: "",
                  role: "admin",
                  status: "verified",
                  ordersCount: 0,
                  totalOrders: 0,
                  isBlacklisted: false,
                  createdAt: new Date(),
               });
            } else {
              throw new Error("Invalid Staff Pass Number. Rider account not found.");
            }

            localStorage.setItem("dadu_user_phone", phone);
            window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
            
            if (phone === "03277004471") {
              setIsAdminConsoleOpen(true);
            }
            setIsAuthOpen(false);
            return;
          }

          const blacklistRef = doc(db, "blacklist", phone);
          const blacklistSnap = await getDoc(blacklistRef);
          if (blacklistSnap.exists()) {
            throw new Error("Yeh number register nahi ho sakta.");
          }

          const profileRef = doc(db, "users", phone);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.status === 'blocked' || data.isBlacklisted) {
              throw new Error("Yeh number register nahi ho sakta.");
            }
          }

          localStorage.setItem("dadu_user_phone", phone);
          window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
          
          if (!profileSnap.exists()) {
            await setDoc(profileRef, {
              uid: phone,
              name: "",
              phone: phone,
              address: "",
              role: "buyer",
              status: "locked",
              ordersCount: 0,
              totalOrders: 0,
              isBlacklisted: false,
              createdAt: new Date(),
            });
          }
          setIsAuthOpen(false);
        }}
      />"""

code = code[:start] + new_auth + code[end:]
with open('src/App.tsx', 'w') as f:
    f.write(code)
