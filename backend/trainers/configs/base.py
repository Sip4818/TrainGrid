from pydantic import BaseModel, ConfigDict


class TrainerConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
