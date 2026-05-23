#!/usr/bin/env python3
"""
Run this script from the frontend root directory:
  python3 patch_landlord_mobile.py
It adds mobile sidebar support to all landlord pages.
"""
import os, re

OVERLAY = '''    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>\n\n'''

TOGGLE_BTN = '''<button class="sidebar-toggle" onclick="openSidebar()" aria-label="Open menu">\n          <i class="bi bi-list" style="font-size:1.2rem"></i>\n        </button>\n        '''

SIDEBAR_FUNCS = """
      function openSidebar() {
        document.getElementById("sidebar").classList.add("open");
        document.getElementById("sidebarOverlay").classList.add("show");
        document.body.style.overflow = "hidden";
      }
      function closeSidebar() {
        document.getElementById("sidebar").classList.remove("open");
        document.getElementById("sidebarOverlay").classList.remove("show");
        document.body.style.overflow = "";
      }"""

pages = [
    "Landlord/announcement.html", "Landlord/dashboard.html",
    "Landlord/invite-codes.html", "Landlord/maintenance.html",
    "Landlord/messages.html", "Landlord/notifications.html",
    "Landlord/payments.html", "Landlord/plaza-details.html",
    "Landlord/plazas.html", "Landlord/profile.html",
    "Landlord/reports.html", "Landlord/settings.html",
    "Landlord/tenants-detail.html", "Landlord/tenants.html",
]

for path in pages:
    if not os.path.exists(path):
        print(f"SKIP (not found): {path}")
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False

    # 1. Add overlay after <body> tag if not already present
    if "sidebar-overlay" not in content:
        content = content.replace("<body>", "<body>\n" + OVERLAY, 1)
        changed = True

    # 2. Add id="sidebar" to sidebar div if missing
    if '<div class="sidebar"' in content and 'id="sidebar"' not in content:
        content = content.replace('<div class="sidebar">', '<div class="sidebar" id="sidebar">', 1)
        changed = True

    # 3. Add sidebar-toggle button in topbar if missing
    if "sidebar-toggle" not in content and "topbar-title" in content:
        content = content.replace(
            '<span class="topbar-title"',
            TOGGLE_BTN + '<span class="topbar-title"',
            1
        )
        changed = True

    # 4. Add closeSidebar/openSidebar functions if missing
    if "openSidebar" not in content and "</script>" in content:
        content = content.replace(
            "</script>",
            SIDEBAR_FUNCS + "\n    </script>",
            1
        )
        changed = True

    # 5. Add onclick="closeSidebar()" to all nav-links if missing
    if "closeSidebar" in content and 'onclick="closeSidebar()"' not in content:
        content = re.sub(
            r'(<a href="[^"]*" class="nav-link[^"]*")>',
            r'\1 onclick="closeSidebar()">',
            content
        )
        changed = True

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Fixed: {path}")
    else:
        print(f"⏭  Already OK: {path}")

print("\nDone! Now run: git add Landlord/ && git commit -m \'Fix: mobile sidebar for all landlord pages\' && git push")