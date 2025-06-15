import pymongo
from pymongo import MongoClient
import logging
import os

# Configure logging
logger = logging.getLogger(__name__)

# Global database connection
db_client = None
db = None

def connect_db(mongodb_uri=None):
    """Connect to MongoDB database"""
    global db_client, db
    
    try:
        # Use provided URI or get from environment
        if not mongodb_uri:
            mongodb_uri = os.getenv('MONGODB_URI')
            if not mongodb_uri:
                raise ValueError("MONGODB_URI environment variable is required")
        
        # Create MongoDB client
        db_client = MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=10000,         # 10 second connection timeout
            socketTimeoutMS=20000,          # 20 second socket timeout
            retryWrites=True
        )
        
        # Test the connection
        db_client.admin.command('ping')
        
        # Get database name from URI or use default
        if 'AmericanCollege' in mongodb_uri:
            db_name = 'AmericanCollege'
        else:
            db_name = 'AmericanCollege'
            
        db = db_client[db_name]
        
        logger.info(f'MongoDB Connected: {db_client.address}')
        logger.info(f'Database Name: {db_name}')
        
        return db
        
    except Exception as error:
        logger.error(f'Database connection failed: {str(error)}')
        raise error

def disconnect_db():
    """Disconnect from MongoDB"""
    global db_client
    
    try:
        if db_client:
            db_client.close()
            logger.info('MongoDB connection closed')
    except Exception as error:
        logger.error(f'Error closing database connection: {str(error)}')

def get_db():
    """Get database instance"""
    global db
    if db is None:
        connect_db()
    return db

def get_collection(collection_name):
    """Get a specific collection"""
    database = get_db()
    return database[collection_name]

# Collection helpers
def get_students_collection():
    """Get students collection"""
    return get_collection('students')

def get_contacts_collection():
    """Get contacts collection"""
    return get_collection('contacts')

# Database health check
def health_check():
    """Check database connection health"""
    try:
        if db_client:
            db_client.admin.command('ping')
            return True
        return False
    except Exception:
        return False 