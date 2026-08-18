"""add approval_status to users"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0db7823c25c1'
down_revision: Union[str, None] = '97ae97d1c5ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('approval_status', sa.String(length=20), server_default='approved', nullable=False))
def downgrade() -> None:
    op.drop_column('users', 'approval_status')
