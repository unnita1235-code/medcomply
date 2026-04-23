from enum import Enum


class AppRole(str, Enum):
    """Application profile role (public.users.app_role) — Admin, Doctor, Staff."""

    admin = "admin"
    doctor = "doctor"
    staff = "staff"
