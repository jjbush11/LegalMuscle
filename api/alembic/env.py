from logging.config import fileConfig
import os
import sys
from sqlalchemy import engine_from_config, pool
from sqlalchemy.ext.declarative import declarative_base  # Corrected import
from alembic import context

# Add the project root to the Python path to allow importing models
# Assuming env.py is in api/alembic, then ../.. goes to the project root
# If your models are directly under api/app, then ../app might be enough
# Or, more robustly, ensure your main application package (e.g., 'app') is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Import your models' Base metadata
# This assumes your models are defined in api.app.models (e.g., api/app/models.py)
# and that they use a declarative base from SQLAlchemy (e.g., Base = declarative_base())
# Adjust the import path as necessary for your project structure.

# Attempt to import Base from a conventional location
# If your models are structured differently, you MUST change this.
# For example, if models.py is in api/app/db/models.py, use from app.db.models import Base
try:
    from app.models import Base  # Assuming your models are in api/app/models.py
except ImportError:
    # Fallback to a generic Base if app.models is not yet created or structured differently
    # This allows alembic to run, but autogenerate won't find your models until this is correct.
    print("Warning: Could not import Base from app.models. Using a placeholder Base. "
          "Autogenerate will not work correctly until this is fixed.")
    Base = declarative_base()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the target_metadata for autogenerate support
target_metadata = Base.metadata

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432") 
POSTGRES_DB = os.getenv("POSTGRES_DB", "evidence_db")
POSTGRES_USER = os.getenv("POSTGRES_USER", "evidence_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "change_me_in_production")

DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Override the sqlalchemy.url in the config
config.set_main_option("sqlalchemy.url", DATABASE_URL)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = DATABASE_URL

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
