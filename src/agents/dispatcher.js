import { createTask } from '../store/tasks'
import { postToFeed } from '../store/classFeed'

export async function dispatchAction(scope, action){
  const task = createTask({ action: { ...action, scope }, createdBy: 'system' })
  switch (action.channel) {
    case 'class-feed':
      if (scope.kind === 'class') {
        postToFeed(scope.classId, { kind:'post', message: action.payload?.message || action.label })
      }
      break
    case 'calendar':
    case 'email':
    default:
      // mock only for now
      break
  }
  return task
}
