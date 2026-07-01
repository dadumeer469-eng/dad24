import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# I want to find the AuthModal onAuthSuccess implementation
start = code.find('<AuthModal')
end = code.find('/>', start) + 2

print(code[start:start+2500])
