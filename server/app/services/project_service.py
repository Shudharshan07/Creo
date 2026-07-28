from datetime import datetime, timezone

from app.models.project import Project


def touch_project(project: Project) -> None:
    """Mark a project as recently updated when related resources change."""
    project.updated_at = datetime.now(timezone.utc)
