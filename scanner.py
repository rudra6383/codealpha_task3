import random

def scan_code(file_path, language):
    # Simulate scanning: random vulnerabilities
    vulns = random.randint(0, 5)
    severity_count = {
        "low": random.randint(0, vulns),
        "medium": random.randint(0, vulns),
        "high": random.randint(0, vulns),
        "critical": random.randint(0, vulns)
    }
    return vulns, severity_count
