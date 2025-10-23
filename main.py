from fastapi import FastAPI, Request, Form, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uuid
import os

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# In-memory session storage
sessions = {}

# In-memory report storage (replace with DB in production)
reports = []

# --- Login ---
@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
def login(request: Request, username: str = Form(...), password: str = Form(...)):
    # For demo: username=admin, password=admin
    if username == "admin" and password == "admin":
        session_id = str(uuid.uuid4())
        sessions[session_id] = username
        response = RedirectResponse("/dashboard", status_code=302)
        response.set_cookie(key="session_id", value=session_id)
        return response
    return templates.TemplateResponse("login.html", {"request": request, "error": "Invalid credentials"})

# --- Logout ---
@app.get("/logout")
def logout(request: Request):
    session_id = request.cookies.get("session_id")
    if session_id and session_id in sessions:
        del sessions[session_id]
    response = RedirectResponse("/login")
    response.delete_cookie("session_id")
    return response

# --- Dashboard ---
@app.get("/dashboard")
def dashboard(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        return RedirectResponse("/login")

    username = sessions[session_id]
    total_scans = len(reports)
    total_vulns = sum(r.get("vulns", 0) for r in reports)
    pending_reports = sum(1 for r in reports if r.get("status") == "Pending")

    # Vulnerability severity demo data
    low = sum(1 for r in reports if r.get("severity") == "Low")
    medium = sum(1 for r in reports if r.get("severity") == "Medium")
    high = sum(1 for r in reports if r.get("severity") == "High")
    critical = sum(1 for r in reports if r.get("severity") == "Critical")

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "username": username,
        "reports": reports,
        "total_scans": total_scans,
        "total_vulns": total_vulns,
        "pending_reports": pending_reports,
        "low_count": low,
        "medium_count": medium,
        "high_count": high,
        "critical_count": critical
    })

# --- Upload ---
@app.get("/upload")
def upload_page(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        return RedirectResponse("/login")
    return templates.TemplateResponse("upload.html", {"request": request})

@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        return RedirectResponse("/login")

    file_location = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(file_location, "wb") as f:
        f.write(await file.read())

    # Dummy scanner simulation
    report = {
        "id": len(reports) + 1,
        "file_name": file.filename,
        "language": file.filename.split('.')[-1].capitalize(),
        "status": "Pending",
        "vulns": 0,
        "severity": "Low"
    }
    reports.append(report)
    return templates.TemplateResponse("upload.html", {"request": request, "success": f"{file.filename} uploaded successfully!"})

# --- Reports ---
@app.get("/reports")
def all_reports(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        return RedirectResponse("/login")
    return templates.TemplateResponse("reports.html", {"request": request, "reports": reports})

@app.get("/reports/{report_id}")
def report_detail(report_id: int, request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        return RedirectResponse("/login")

    report = next((r for r in reports if r["id"] == report_id), None)
    if not report:
        return RedirectResponse("/reports")
    return templates.TemplateResponse("report_detail.html", {"request": request, "report": report})
