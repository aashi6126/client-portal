"""add tasks and task_comments

Adds two tables to support the internal task-management feature:

  tasks
    - title, description, status, priority
    - assignee_id / created_by_id both FK -> users.id
    - created_at, updated_at, completed_at

  task_comments
    - task_id FK -> tasks.id ON DELETE CASCADE
    - author_id FK -> users.id
    - body, created_at

Revision ID: d3f1a8c62b09
Revises: c9f2a4b7d1e8
Create Date: 2026-07-26 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = 'd3f1a8c62b09'
down_revision = 'c9f2a4b7d1e8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='Open'),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='Medium'),
        sa.Column('assignee_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_tasks_assignee_id', 'tasks', ['assignee_id'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])

    op.create_table(
        'task_comments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('task_id', sa.Integer(),
                  sa.ForeignKey('tasks.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('author_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_task_comments_task_id', 'task_comments', ['task_id'])


def downgrade():
    op.drop_index('ix_task_comments_task_id', table_name='task_comments')
    op.drop_table('task_comments')
    op.drop_index('ix_tasks_status', table_name='tasks')
    op.drop_index('ix_tasks_assignee_id', table_name='tasks')
    op.drop_table('tasks')
