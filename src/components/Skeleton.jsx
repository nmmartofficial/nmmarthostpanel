import React from 'react'
import { cn } from '../utils/helpers'

export const Skeleton = ({ className, variant = 'text', ...props }) => {
  const baseStyles = "animate-pulse bg-slate-200 dark:bg-slate-700 rounded-md"
  
  const variants = {
    text: "h-4 w-3/4",
    title: "h-6 w-1/2 mb-2",
    avatar: "h-12 w-12 rounded-full",
    button: "h-10 w-24",
    thumbnail: "h-48 w-full rounded-xl",
    card: "h-64 w-full rounded-2xl"
  }
  
  return (
    <div 
      className={cn(
        baseStyles,
        variants[variant] || variants.text,
        className
      )}
      {...props}
    />
  )
}

export const SkeletonList = ({ count = 5, children, className }) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          {children || <Skeleton />}
        </React.Fragment>
      ))}
    </div>
  )
}

export const SkeletonCard = ({ className }) => {
  return (
    <div className={cn("bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700", className)}>
      <Skeleton variant="title" />
      <Skeleton className="w-full mb-2" />
      <Skeleton className="w-5/6 mb-2" />
      <Skeleton className="w-2/3" />
    </div>
  )
}
