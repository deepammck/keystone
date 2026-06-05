"use client";

import type { Link } from "@/lib/types";
import { LinkItem } from "@/components/links/LinkItem";

type Props = {
  links: Link[];
  totalCount: number;
  query: string;
  onEdit: (
    id: string,
    input: { url: string; note: string; tags: string[] },
  ) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
};

export function LinkList({
  links,
  totalCount,
  query,
  onEdit,
  onDelete,
  onTagClick,
}: Props) {
  if (totalCount === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No links yet. Save your first one above.
      </p>
    );
  }
  if (links.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No links match “{query}”.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {links.map((link) => (
        <LinkItem
          key={link.id}
          link={link}
          onEdit={onEdit}
          onDelete={onDelete}
          onTagClick={onTagClick}
        />
      ))}
    </ul>
  );
}
