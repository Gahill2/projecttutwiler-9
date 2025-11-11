from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok"}

# TODO: Implement POST /run to increment daily_metrics in JawsDB
# @app.post("/run")
# async def run():
#     # Connect to JawsDB and update daily_metrics
#     pass

