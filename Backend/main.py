import uvicorn
from Backend.core.config import settings

def main():
    uvicorn.run(
        "Backend.api:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
        workers=1,
    )

if __name__ == "__main__":
    main()
    
