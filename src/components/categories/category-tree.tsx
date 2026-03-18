"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { categoryIconMap } from "@/lib/category-icons"
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import type { MainCategory, SubCategory } from "@/types"

interface CategoryTreeProps {
  categories: MainCategory[]
  onReorder: (categoryId: string, newParentId: string, newSortOrder: number) => void
  onEditSub: (sub: SubCategory) => void
  onDeleteSub: (id: string, name: string) => void
  onAddSub: (parentId: string) => void
  onEditMainBudget: (cat: MainCategory) => void
}

function DraggableSubCategory({
  sub,
  onEdit,
  onDelete,
}: {
  sub: SubCategory
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-accent/30"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{sub.name}</span>
          {sub.isSystem && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Sistem</Badge>
          )}
        </div>
        {sub.budgetLimit && (
          <p className="text-xs text-muted-foreground">
            Bütçe: {formatCurrency(sub.budgetLimit)}
          </p>
        )}
      </div>
      {sub._count && (
        <span className="text-xs text-muted-foreground shrink-0">
          {sub._count.transactions} işlem
        </span>
      )}
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!sub.isSystem && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  )
}

function DroppableMainCategory({
  category,
  onEditSub,
  onDeleteSub,
  onAddSub,
  onEditMainBudget,
}: {
  category: MainCategory
  onEditSub: (sub: SubCategory) => void
  onDeleteSub: (id: string, name: string) => void
  onAddSub: () => void
  onEditMainBudget: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const { setNodeRef, isOver } = useDroppable({ id: `droppable-${category.id}` })

  const iconName = category.icon ?? "tag"
  const IconComponent = categoryIconMap[iconName] ?? categoryIconMap.tag

  return (
    <Card className={`transition-colors ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{category.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {category.children.length} alt kategori
              {category.budgetLimit ? ` · Bütçe: ${formatCurrency(category.budgetLimit)}` : ""}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEditMainBudget}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onAddSub}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent ref={setNodeRef} className="pt-0">
          <div className="space-y-2">
            {category.children.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Alt kategori yok. Eklemek için + butonuna tıklayın veya sürükleyip bırakın.
              </div>
            ) : (
              category.children.map((sub) => (
                <DraggableSubCategory
                  key={sub.id}
                  sub={sub}
                  onEdit={() => onEditSub(sub)}
                  onDelete={() => onDeleteSub(sub.id, sub.name)}
                />
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function CategoryTree({
  categories,
  onReorder,
  onEditSub,
  onDeleteSub,
  onAddSub,
  onEditMainBudget,
}: CategoryTreeProps) {
  const [activeItem, setActiveItem] = useState<SubCategory | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    for (const cat of categories) {
      const sub = cat.children.find((c) => c.id === id)
      if (sub) {
        setActiveItem(sub)
        break
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return

    const draggedId = active.id as string
    const overId = over.id as string

    const targetParentId = overId.startsWith("droppable-")
      ? overId.replace("droppable-", "")
      : null

    if (!targetParentId) {
      for (const cat of categories) {
        const overSub = cat.children.find((c) => c.id === overId)
        if (overSub && overSub.parentId) {
          const overIndex = cat.children.findIndex((c) => c.id === overId)
          onReorder(draggedId, overSub.parentId, overIndex)
          return
        }
      }
      return
    }

    const targetCat = categories.find((c) => c.id === targetParentId)
    const newOrder = targetCat ? targetCat.children.length : 0
    onReorder(draggedId, targetParentId, newOrder)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {categories.map((cat) => (
          <DroppableMainCategory
            key={cat.id}
            category={cat}
            onEditSub={onEditSub}
            onDeleteSub={onDeleteSub}
            onAddSub={() => onAddSub(cat.id)}
            onEditMainBudget={() => onEditMainBudget(cat)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{activeItem.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
