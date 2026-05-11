from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.relationship import RelationshipEdge, RelationshipNode

router = APIRouter(prefix="/api/v1/relationships", tags=["relationships"])


def _node_out(n: RelationshipNode) -> dict:
    return {"id": n.id, "label": n.label, "type": n.type, "risk": n.risk}


def _edge_out(e: RelationshipEdge) -> dict:
    return {"id": str(e.id), "source": e.source, "target": e.target, "label": e.label}


@router.get("/graph")
async def get_graph(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    nodes = (await db.execute(select(RelationshipNode))).scalars().all()
    edges = (await db.execute(select(RelationshipEdge))).scalars().all()
    return {
        "nodes": [_node_out(n) for n in nodes],
        "edges": [_edge_out(e) for e in edges],
    }


@router.get("/context/{employee_id}")
async def get_relationship_context(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    edges_result = await db.execute(
        select(RelationshipEdge).where(
            or_(RelationshipEdge.source == employee_id, RelationshipEdge.target == employee_id)
        )
    )
    edges = edges_result.scalars().all()

    neighbor_ids = {employee_id}
    for e in edges:
        neighbor_ids.add(e.source)
        neighbor_ids.add(e.target)

    nodes_result = await db.execute(
        select(RelationshipNode).where(RelationshipNode.id.in_(neighbor_ids))
    )
    nodes = nodes_result.scalars().all()

    return {
        "nodes": [_node_out(n) for n in nodes],
        "edges": [_edge_out(e) for e in edges],
    }
