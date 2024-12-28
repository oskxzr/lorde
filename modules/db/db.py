from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Union, Callable
from pymongo import MongoClient, ReturnDocument
from pymongo.collection import Collection as PyMongoCollection
from pymongo.errors import PyMongoError
from datetime import datetime, timezone

class DBError(Exception):
    pass

class DB:
    def __init__(self, connection_string: str = None):
        self.client = MongoClient(connection_string or os.environ["MONGO_LINK"])
        self.logger = logging.getLogger(__name__)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        self.client.close()

    def get_collection(self, database: str, collection: str, id_field: str = "_id", id_generation_function: Optional[Callable] = None, include_created_at: bool = False) -> Collection:
        return Collection(self.client[database][collection], id_field, id_generation_function, self.logger, include_created_at)

class Collection:
    def __init__(self, collection: PyMongoCollection, id_field: str = "_id", id_generation_function: Optional[Callable] = None, logger: Optional[logging.Logger] = None, include_created_at: bool = False):
        self.collection = collection
        self.id_field = id_field
        self.id_generation_function = id_generation_function
        self.include_created_at = include_created_at
        self.logger = logger or logging.getLogger(__name__)

    def _process_query(self, query: Union[Dict, Any]) -> Dict:
        if isinstance(query, dict):
            return query
        return {self.id_field: query}

    def find(self, query: Union[Dict, Any], **kwargs) -> Optional[Dict]:
        try:
            return self.collection.find_one(self._process_query(query), **kwargs)
        except PyMongoError as e:
            self.logger.error(f"Error in find: {e}")
            raise DBError(f"Error in find: {e}")

    def find_many(self, query: Dict, **kwargs) -> List[Dict]:
        try:
            return list(self.collection.find(query, **kwargs))
        except PyMongoError as e:
            self.logger.error(f"Error in find_many: {e}")
            raise DBError(f"Error in find_many: {e}")

    def set(self, data: Dict) -> Optional[Any]:
        try:
            if "_id" not in data:
                if self.id_generation_function:
                    while True:
                        generated_id = self.id_generation_function()
                        if not self.find({self.id_field: generated_id}):
                            data[self.id_field] = generated_id
                            break
                        self.logger.warning(f"Id {generated_id} already exists, generating a new one")
                if self.include_created_at:
                    data["createdAt"] = datetime.now(timezone.utc)
                result = self.collection.insert_one(data)
                return result.inserted_id
            else:
                result = self.collection.find_one_and_update(
                    {self.id_field: data["_id"]},
                    {"$set": data},
                    upsert=True,
                    return_document=ReturnDocument.AFTER
                )
                return result.get(self.id_field) if result else None
        except PyMongoError as e:
            self.logger.error(f"Error in set: {e}")
            raise DBError(f"Error in set: {e}")
        
    def delete(self, query: Union[Dict, Any]) -> bool:
            try:
                result = self.collection.delete_one(self._process_query(query))
                return result.deleted_count > 0
            except PyMongoError as e:
                print(f"Error in delete: {e}")
                return False

    def delete_many(self, query: Dict) -> int:
        try:
            result = self.collection.delete_many(query)
            return result.deleted_count
        except PyMongoError as e:
            print(f"Error in delete_many: {e}")
            return 0

    def increment(self, query: Union[Dict, Any], field: str, value: Union[int, float]) -> Optional[Dict]:
        try:
            return self.collection.find_one_and_update(
                self._process_query(query),
                {"$inc": {field: value}},
                return_document=ReturnDocument.AFTER
            )
        except PyMongoError as e:
            print(f"Error in increment: {e}")
            return None

    def increment_many(self, query: Dict, field: str, value: Union[int, float]) -> int:
        try:
            result = self.collection.update_many(query, {"$inc": {field: value}})
            return result.modified_count
        except PyMongoError as e:
            print(f"Error in increment_many: {e}")
            return 0

    def push(self, query: Union[Dict, Any], field: str, value: Any) -> Optional[Dict]:
        try:
            return self.collection.find_one_and_update(
                self._process_query(query),
                {"$push": {field: value}},
                return_document=ReturnDocument.AFTER
            )
        except PyMongoError as e:
            print(f"Error in push: {e}")
            return None

    def pull(self, query: Union[Dict, Any], field: str, value: Any) -> Optional[Dict]:
        try:
            return self.collection.find_one_and_update(
                self._process_query(query),
                {"$pull": {field: value}},
                return_document=ReturnDocument.AFTER
            )
        except PyMongoError as e:
            print(f"Error in pull: {e}")
            return None

    def aggregate(self, pipeline: List[Dict]) -> List[Dict]:
        try:
            return list(self.collection.aggregate(pipeline))
        except PyMongoError as e:
            print(f"Error in aggregate: {e}")
            return []
