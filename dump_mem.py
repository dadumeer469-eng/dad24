import re

maps_file = open("/proc/925/maps", "r")
mem_file = open("/proc/925/mem", "rb", 0)
out_file = open("/tmp/vite_dump.bin", "wb")

for line in maps_file.readlines():
    m = re.match(r"([0-9A-Fa-f]+)-([0-9A-Fa-f]+) ([-r])", line)
    if m.group(3) == 'r':
        start = int(m.group(1), 16)
        end = int(m.group(2), 16)
        try:
            mem_file.seek(start)
            chunk = mem_file.read(end - start)
            out_file.write(chunk)
        except:
            pass
out_file.close()
maps_file.close()
mem_file.close()
