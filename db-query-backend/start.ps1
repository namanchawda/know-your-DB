Set-Location $PSScriptRoot
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 3001
