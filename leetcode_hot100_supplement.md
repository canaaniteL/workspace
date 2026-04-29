
# LeetCode Hot 100 补充题目

> **补充说明**：以下为 LeetCode Hot 100 中原题库缺失的题目，共补充 **39 道**。
> 每道题包含题目描述、核心思路、C++ 解法。

---

# 补充一、哈希表

## 【LeetCode 49】字母异位词分组
**题目**：给你一个字符串数组，请你将字母异位词组合在一起。字母异位词是由重新排列源单词的所有字母得到的一个新单词。
示例：输入 `["eat","tea","tan","ate","nat","bat"]`，输出 `[["bat"],["nat","tan"],["ate","eat","tea"]]`

**核心思路**：对每个字符串排序后作为哈希 key，相同 key 的放一组。

```cpp
vector<vector<string>> groupAnagrams(vector<string>& strs) {
    unordered_map<string, vector<string>> mp;
    for (auto& s : strs) {
        string key = s;
        sort(key.begin(), key.end());
        mp[key].push_back(s);
    }
    vector<vector<string>> res;
    for (auto& [k, v] : mp) res.push_back(v);
    return res;
}
```

---

## 【LeetCode 347】前 K 个高频元素
**题目**：给你一个整数数组 `nums` 和一个整数 `k`，返回其中出现频率前 `k` 高的元素。

**核心思路**：哈希统计频次 + 小顶堆（优先队列）维护 top K。

```cpp
vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int, int> freq;
    for (int n : nums) freq[n]++;
    auto cmp = [](pair<int,int>& a, pair<int,int>& b) { return a.second > b.second; };
    priority_queue<pair<int,int>, vector<pair<int,int>>, decltype(cmp)> pq(cmp);
    for (auto& [num, cnt] : freq) {
        pq.push({num, cnt});
        if (pq.size() > k) pq.pop();
    }
    vector<int> res;
    while (!pq.empty()) { res.push_back(pq.top().first); pq.pop(); }
    return res;
}
```

---

## 【LeetCode 560】和为 K 的子数组
**题目**：给你一个整数数组 `nums` 和一个整数 `k`，统计并返回该数组中和为 `k` 的连续子数组的个数。

**核心思路**：前缀和 + 哈希表。`prefixSum[i] - prefixSum[j] == k` 即 `j~i` 的子数组和为 k。

```cpp
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> prefixCount;
    prefixCount[0] = 1;
    int sum = 0, count = 0;
    for (int num : nums) {
        sum += num;
        if (prefixCount.count(sum - k))
            count += prefixCount[sum - k];
        prefixCount[sum]++;
    }
    return count;
}
```

---

# 补充二、双指针

## 【LeetCode 75】颜色分类
**题目**：给定一个包含红色(0)、白色(1)和蓝色(2)的数组，原地排序使相同颜色相邻，按0、1、2顺序排列。

**核心思路**：三指针（荷兰国旗问题）。p0指向0的右边界，p2指向2的左边界，curr遍历。

```cpp
void sortColors(vector<int>& nums) {
    int p0 = 0, curr = 0, p2 = nums.size() - 1;
    while (curr <= p2) {
        if (nums[curr] == 0) swap(nums[curr++], nums[p0++]);
        else if (nums[curr] == 2) swap(nums[curr], nums[p2--]);
        else curr++;
    }
}
```

---

## 【LeetCode 76】最小覆盖子串
**题目**：给你字符串 `s` 和 `t`，返回 `s` 中涵盖 `t` 所有字符的最小子串。

**核心思路**：滑动窗口。右指针扩展直到包含所有字符，左指针收缩找最小。

```cpp
string minWindow(string s, string t) {
    unordered_map<char, int> need, window;
    for (char c : t) need[c]++;
    int left = 0, valid = 0, start = 0, minLen = INT_MAX;
    for (int right = 0; right < s.size(); right++) {
        char c = s[right];
        if (need.count(c)) {
            window[c]++;
            if (window[c] == need[c]) valid++;
        }
        while (valid == need.size()) {
            if (right - left + 1 < minLen) {
                start = left;
                minLen = right - left + 1;
            }
            char d = s[left++];
            if (need.count(d)) {
                if (window[d] == need[d]) valid--;
                window[d]--;
            }
        }
    }
    return minLen == INT_MAX ? "" : s.substr(start, minLen);
}
```

---

# 补充三、链表

## 【LeetCode 21】合并两个有序链表
**题目**：将两个升序链表合并为一个新的升序链表并返回。

**核心思路**：哨兵节点 + 逐一比较。

```cpp
ListNode* mergeTwoLists(ListNode* l1, ListNode* l2) {
    ListNode dummy(0);
    ListNode* curr = &dummy;
    while (l1 && l2) {
        if (l1->val <= l2->val) { curr->next = l1; l1 = l1->next; }
        else { curr->next = l2; l2 = l2->next; }
        curr = curr->next;
    }
    curr->next = l1 ? l1 : l2;
    return dummy.next;
}
```

---

## 【LeetCode 141】环形链表
**题目**：判断链表中是否有环。

**核心思路**：快慢指针，快指针每次走两步，慢指针走一步，若相遇则有环。

```cpp
bool hasCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}
```

---

## 【LeetCode 142】环形链表 II
**题目**：给定链表，返回链表开始入环的第一个节点。如果无环返回 null。

**核心思路**：快慢指针相遇后，一个从头开始、一个从相遇点开始，每次各走一步，再次相遇即入环点。

```cpp
ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            ListNode* ptr = head;
            while (ptr != slow) { ptr = ptr->next; slow = slow->next; }
            return ptr;
        }
    }
    return nullptr;
}
```

---

## 【LeetCode 146】LRU 缓存
**题目**：设计一个满足 LRU 缓存约束的数据结构，`get` 和 `put` 操作均为 O(1)。

**核心思路**：哈希表 + 双向链表。哈希表存 key 到链表节点的映射，链表维护访问顺序。

```cpp
class LRUCache {
    int cap;
    list<pair<int,int>> cache;
    unordered_map<int, list<pair<int,int>>::iterator> mp;
public:
    LRUCache(int capacity) : cap(capacity) {}
    int get(int key) {
        if (!mp.count(key)) return -1;
        cache.splice(cache.begin(), cache, mp[key]);
        return mp[key]->second;
    }
    void put(int key, int value) {
        if (mp.count(key)) {
            mp[key]->second = value;
            cache.splice(cache.begin(), cache, mp[key]);
        } else {
            if (cache.size() == cap) {
                mp.erase(cache.back().first);
                cache.pop_back();
            }
            cache.push_front({key, value});
            mp[key] = cache.begin();
        }
    }
};
```

---

## 【LeetCode 148】排序链表
**题目**：给你链表的头结点，在 O(n log n) 时间和 O(1) 空间下排序。

**核心思路**：归并排序。快慢指针找中点，递归排序左右两半，合并。

```cpp
ListNode* sortList(ListNode* head) {
    if (!head || !head->next) return head;
    ListNode *slow = head, *fast = head->next;
    while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
    ListNode* mid = slow->next;
    slow->next = nullptr;
    ListNode* left = sortList(head);
    ListNode* right = sortList(mid);
    ListNode dummy(0);
    ListNode* curr = &dummy;
    while (left && right) {
        if (left->val <= right->val) { curr->next = left; left = left->next; }
        else { curr->next = right; right = right->next; }
        curr = curr->next;
    }
    curr->next = left ? left : right;
    return dummy.next;
}
```

---

## 【LeetCode 160】相交链表
**题目**：找到两个单链表相交的起始节点。

**核心思路**：双指针，A走完走B，B走完走A，最终会在交点相遇（或同时到null）。

```cpp
ListNode* getIntersectionNode(ListNode* headA, ListNode* headB) {
    ListNode *a = headA, *b = headB;
    while (a != b) {
        a = a ? a->next : headB;
        b = b ? b->next : headA;
    }
    return a;
}
```

---

## 【LeetCode 206】反转链表
**题目**：给你单链表的头节点，反转链表并返回。

**核心思路**：三指针迭代，逐个反转。

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode *prev = nullptr, *curr = head;
    while (curr) {
        ListNode* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}
```

---

## 【LeetCode 234】回文链表
**题目**：判断链表是否为回文链表，O(n) 时间 O(1) 空间。

**核心思路**：快慢指针找中点 → 反转后半段 → 逐一比较。

```cpp
bool isPalindrome(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
    ListNode *prev = nullptr, *curr = slow;
    while (curr) { ListNode* next = curr->next; curr->next = prev; prev = curr; curr = next; }
    ListNode *p1 = head, *p2 = prev;
    while (p2) {
        if (p1->val != p2->val) return false;
        p1 = p1->next; p2 = p2->next;
    }
    return true;
}
```

---

# 补充四、二分查找

## 【LeetCode 4】寻找两个正序数组的中位数
**题目**：给定两个大小分别为 m 和 n 的正序数组，找出并返回这两个数组的中位数。时间复杂度 O(log(m+n))。

**核心思路**：二分查找较短数组的分割位置，确保左半部分最大值 ≤ 右半部分最小值。

```cpp
double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
    if (nums1.size() > nums2.size()) swap(nums1, nums2);
    int m = nums1.size(), n = nums2.size();
    int lo = 0, hi = m;
    while (lo <= hi) {
        int i = (lo + hi) / 2, j = (m + n + 1) / 2 - i;
        int lMax1 = i == 0 ? INT_MIN : nums1[i-1];
        int rMin1 = i == m ? INT_MAX : nums1[i];
        int lMax2 = j == 0 ? INT_MIN : nums2[j-1];
        int rMin2 = j == n ? INT_MAX : nums2[j];
        if (lMax1 <= rMin2 && lMax2 <= rMin1) {
            if ((m + n) % 2) return max(lMax1, lMax2);
            return (max(lMax1, lMax2) + min(rMin1, rMin2)) / 2.0;
        } else if (lMax1 > rMin2) hi = i - 1;
        else lo = i + 1;
    }
    return 0;
}
```
- **时间复杂度**：O(log(min(m,n)))

---

## 【LeetCode 33】搜索旋转排序数组
**题目**：整数数组在某个下标处旋转过，搜索目标值，O(log n)。

**核心思路**：二分查找，判断哪半段有序，然后确定 target 在哪半段。

```cpp
int search(vector<int>& nums, int target) {
    int lo = 0, hi = nums.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}
```

---

## 【LeetCode 34】在排序数组中查找元素的第一个和最后一个位置
**题目**：给定升序数组和目标值，找出目标值的开始和结束位置，O(log n)。

**核心思路**：两次二分，分别找左边界和右边界。

```cpp
vector<int> searchRange(vector<int>& nums, int target) {
    int left = lower(nums, target);
    int right = lower(nums, target + 1) - 1;
    if (left < nums.size() && nums[left] == target) return {left, right};
    return {-1, -1};
}
int lower(vector<int>& nums, int target) {
    int lo = 0, hi = nums.size();
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

---

# 补充五、栈

## 【LeetCode 155】最小栈
**题目**：设计一个支持 push、pop、top 和在常数时间内检索最小元素的栈。

**核心思路**：辅助栈同步维护当前最小值。

```cpp
class MinStack {
    stack<int> st, minSt;
public:
    MinStack() {}
    void push(int val) {
        st.push(val);
        if (minSt.empty() || val <= minSt.top()) minSt.push(val);
    }
    void pop() {
        if (st.top() == minSt.top()) minSt.pop();
        st.pop();
    }
    int top() { return st.top(); }
    int getMin() { return minSt.top(); }
};
```

---

# 补充六、树

## 【LeetCode 94】二叉树的中序遍历
**题目**：给定二叉树的根节点，返回它的中序遍历。

**核心思路**：递归或迭代（栈模拟）。

```cpp
vector<int> inorderTraversal(TreeNode* root) {
    vector<int> res;
    stack<TreeNode*> st;
    TreeNode* curr = root;
    while (curr || !st.empty()) {
        while (curr) { st.push(curr); curr = curr->left; }
        curr = st.top(); st.pop();
        res.push_back(curr->val);
        curr = curr->right;
    }
    return res;
}
```

---

## 【LeetCode 104】二叉树的最大深度
**题目**：给定二叉树，找出其最大深度。

**核心思路**：递归，`max(左深度, 右深度) + 1`。

```cpp
int maxDepth(TreeNode* root) {
    if (!root) return 0;
    return max(maxDepth(root->left), maxDepth(root->right)) + 1;
}
```

---

## 【LeetCode 208】实现 Trie (前缀树)
**题目**：实现一个 Trie 类，支持 insert、search 和 startsWith 操作。

**核心思路**：26叉树，每个节点包含 children[26] 和 isEnd 标志。

```cpp
class Trie {
    Trie* children[26] = {};
    bool isEnd = false;
public:
    Trie() {}
    void insert(string word) {
        Trie* node = this;
        for (char c : word) {
            int i = c - 'a';
            if (!node->children[i]) node->children[i] = new Trie();
            node = node->children[i];
        }
        node->isEnd = true;
    }
    bool search(string word) {
        Trie* node = find(word);
        return node && node->isEnd;
    }
    bool startsWith(string prefix) {
        return find(prefix) != nullptr;
    }
    Trie* find(string& s) {
        Trie* node = this;
        for (char c : s) {
            int i = c - 'a';
            if (!node->children[i]) return nullptr;
            node = node->children[i];
        }
        return node;
    }
};
```

---

## 【LeetCode 226】翻转二叉树
**题目**：给你一棵二叉树的根节点 root，翻转这棵二叉树，并返回其根节点。

**核心思路**：递归交换左右子树。

```cpp
TreeNode* invertTree(TreeNode* root) {
    if (!root) return nullptr;
    swap(root->left, root->right);
    invertTree(root->left);
    invertTree(root->right);
    return root;
}
```

---

## 【LeetCode 236】二叉树的最近公共祖先
**题目**：给定二叉树，找到两个指定节点的最近公共祖先。

**核心思路**：递归。若当前节点是 p 或 q 则返回自身；左右子树分别查找，两边都找到则当前节点是 LCA。

```cpp
TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
    if (!root || root == p || root == q) return root;
    TreeNode* left = lowestCommonAncestor(root->left, p, q);
    TreeNode* right = lowestCommonAncestor(root->right, p, q);
    if (left && right) return root;
    return left ? left : right;
}
```

---

## 【LeetCode 538】把二叉搜索树转换为累加树
**题目**：使每个节点的值是原树中大于或等于该节点值的所有值之和。

**核心思路**：反向中序遍历（右→根→左），累加求和。

```cpp
class Solution {
    int sum = 0;
public:
    TreeNode* convertBST(TreeNode* root) {
        if (!root) return nullptr;
        convertBST(root->right);
        sum += root->val;
        root->val = sum;
        convertBST(root->left);
        return root;
    }
};
```

---

## 【LeetCode 543】二叉树的直径
**题目**：给你一棵二叉树的根节点，返回该树的直径（任意两节点之间最长路径的边数）。

**核心思路**：后序遍历，每个节点的直径 = 左深度 + 右深度，全局维护最大值。

```cpp
class Solution {
    int ans = 0;
public:
    int diameterOfBinaryTree(TreeNode* root) { depth(root); return ans; }
    int depth(TreeNode* node) {
        if (!node) return 0;
        int l = depth(node->left), r = depth(node->right);
        ans = max(ans, l + r);
        return max(l, r) + 1;
    }
};
```

---

# 补充七、数组

## 【LeetCode 169】多数元素
**题目**：给定大小为 n 的数组，找出出现次数大于 n/2 的元素。

**核心思路**：Boyer-Moore 投票算法。候选人计数为0时更换候选人。

```cpp
int majorityElement(vector<int>& nums) {
    int candidate = 0, count = 0;
    for (int num : nums) {
        if (count == 0) candidate = num;
        count += (num == candidate) ? 1 : -1;
    }
    return candidate;
}
```

---

## 【LeetCode 215】数组中的第K个最大元素
**题目**：在未排序的数组中找到第 k 个最大的元素。

**核心思路**：快速选择算法（partition），平均 O(N)。

```cpp
int findKthLargest(vector<int>& nums, int k) {
    int target = nums.size() - k;
    int lo = 0, hi = nums.size() - 1;
    while (lo < hi) {
        int pivot = partition(nums, lo, hi);
        if (pivot == target) return nums[pivot];
        else if (pivot < target) lo = pivot + 1;
        else hi = pivot - 1;
    }
    return nums[lo];
}
int partition(vector<int>& nums, int lo, int hi) {
    int pivot = nums[hi], i = lo;
    for (int j = lo; j < hi; j++) {
        if (nums[j] <= pivot) swap(nums[i++], nums[j]);
    }
    swap(nums[i], nums[hi]);
    return i;
}
```

---

## 【LeetCode 238】除自身以外数组的乘积
**题目**：给你一个数组 `nums`，返回数组 `answer`，其中 `answer[i]` 等于 `nums` 中除 `nums[i]` 之外其余各元素的乘积。不能用除法，O(n) 时间。

**核心思路**：两遍扫描。先从左到右算左侧乘积，再从右到左乘上右侧乘积。

```cpp
vector<int> productExceptSelf(vector<int>& nums) {
    int n = nums.size();
    vector<int> res(n, 1);
    int left = 1;
    for (int i = 0; i < n; i++) { res[i] = left; left *= nums[i]; }
    int right = 1;
    for (int i = n - 1; i >= 0; i--) { res[i] *= right; right *= nums[i]; }
    return res;
}
```

---

# 补充八、回溯

## 【LeetCode 78】子集
**题目**：给你一个整数数组 `nums`，返回该数组所有可能的子集。

**核心思路**：回溯，每个元素选或不选。

```cpp
vector<vector<int>> subsets(vector<int>& nums) {
    vector<vector<int>> res;
    vector<int> path;
    backtrack(nums, 0, path, res);
    return res;
}
void backtrack(vector<int>& nums, int start, vector<int>& path, vector<vector<int>>& res) {
    res.push_back(path);
    for (int i = start; i < nums.size(); i++) {
        path.push_back(nums[i]);
        backtrack(nums, i + 1, path, res);
        path.pop_back();
    }
}
```

---

# 补充九、BFS

## 【LeetCode 200】岛屿数量
**题目**：给你一个 `'1'`（陆地）和 `'0'`（水）组成的二维网格，计算岛屿数量。

**核心思路**：遍历网格，遇到 '1' 就 DFS/BFS 将整个岛标记为已访问，计数+1。

```cpp
int numIslands(vector<vector<char>>& grid) {
    int count = 0, m = grid.size(), n = grid[0].size();
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (grid[i][j] == '1') {
                count++;
                dfs(grid, i, j);
            }
        }
    }
    return count;
}
void dfs(vector<vector<char>>& grid, int i, int j) {
    if (i < 0 || i >= grid.size() || j < 0 || j >= grid[0].size() || grid[i][j] != '1') return;
    grid[i][j] = '0';
    dfs(grid, i+1, j); dfs(grid, i-1, j);
    dfs(grid, i, j+1); dfs(grid, i, j-1);
}
```

---

## 【LeetCode 207】课程表
**题目**：判断是否可能完成所有课程（检测有向图是否有环）。

**核心思路**：拓扑排序（BFS）。入度为0的先入队，逐步减少其他节点入度。

```cpp
bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
    vector<int> indegree(numCourses, 0);
    vector<vector<int>> graph(numCourses);
    for (auto& p : prerequisites) {
        graph[p[1]].push_back(p[0]);
        indegree[p[0]]++;
    }
    queue<int> q;
    for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.push(i);
    int count = 0;
    while (!q.empty()) {
        int cur = q.front(); q.pop(); count++;
        for (int next : graph[cur]) {
            if (--indegree[next] == 0) q.push(next);
        }
    }
    return count == numCourses;
}
```

---

# 补充十、动态规划

## 【LeetCode 10】正则表达式匹配
**题目**：实现支持 `'.'` 和 `'*'` 的正则表达式匹配。`'.'` 匹配任意单字符，`'*'` 匹配零个或多个前面的元素。

**核心思路**：二维 DP。`dp[i][j]` 表示 s 的前 i 个字符和 p 的前 j 个字符是否匹配。

```cpp
bool isMatch(string s, string p) {
    int m = s.size(), n = p.size();
    vector<vector<bool>> dp(m+1, vector<bool>(n+1, false));
    dp[0][0] = true;
    for (int j = 1; j <= n; j++)
        if (p[j-1] == '*') dp[0][j] = dp[0][j-2];
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (p[j-1] == '*') {
                dp[i][j] = dp[i][j-2]; // * 匹配零次
                if (p[j-2] == '.' || p[j-2] == s[i-1])
                    dp[i][j] = dp[i][j] || dp[i-1][j]; // * 匹配一次或多次
            } else if (p[j-1] == '.' || p[j-1] == s[i-1]) {
                dp[i][j] = dp[i-1][j-1];
            }
        }
    }
    return dp[m][n];
}
```

---

## 【LeetCode 53】最大子数组和
**题目**：给你一个整数数组 `nums`，找到一个具有最大和的连续子数组，返回其最大和。

**核心思路**：Kadane 算法。`dp[i] = max(nums[i], dp[i-1] + nums[i])`。

```cpp
int maxSubArray(vector<int>& nums) {
    int maxSum = nums[0], curSum = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        curSum = max(nums[i], curSum + nums[i]);
        maxSum = max(maxSum, curSum);
    }
    return maxSum;
}
```

---

## 【LeetCode 62】不同路径
**题目**：机器人从 m×n 网格左上角到右下角，每次只能向下或向右，有多少条不同路径。

**核心思路**：DP，`dp[i][j] = dp[i-1][j] + dp[i][j-1]`。

```cpp
int uniquePaths(int m, int n) {
    vector<vector<int>> dp(m, vector<int>(n, 1));
    for (int i = 1; i < m; i++)
        for (int j = 1; j < n; j++)
            dp[i][j] = dp[i-1][j] + dp[i][j-1];
    return dp[m-1][n-1];
}
```

---

## 【LeetCode 64】最小路径和
**题目**：给定一个 m×n 的网格，找一条从左上角到右下角的路径，使路径上的数字总和最小。

**核心思路**：DP，`dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])`。

```cpp
int minPathSum(vector<vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    for (int i = 1; i < m; i++) grid[i][0] += grid[i-1][0];
    for (int j = 1; j < n; j++) grid[0][j] += grid[0][j-1];
    for (int i = 1; i < m; i++)
        for (int j = 1; j < n; j++)
            grid[i][j] += min(grid[i-1][j], grid[i][j-1]);
    return grid[m-1][n-1];
}
```

---

## 【LeetCode 70】爬楼梯
**题目**：每次可以爬 1 或 2 个台阶，有多少种方法爬到 n 阶。

**核心思路**：斐波那契数列。`dp[i] = dp[i-1] + dp[i-2]`。

```cpp
int climbStairs(int n) {
    if (n <= 2) return n;
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) { int c = a + b; a = b; b = c; }
    return b;
}
```

---

## 【LeetCode 72】编辑距离
**题目**：给你两个单词 word1 和 word2，计算将 word1 转换成 word2 所使用的最少操作数（插入、删除、替换）。

**核心思路**：经典二维 DP。`dp[i][j]` 表示 word1 前 i 个字符转换到 word2 前 j 个字符的最少操作数。

```cpp
int minDistance(string word1, string word2) {
    int m = word1.size(), n = word2.size();
    vector<vector<int>> dp(m+1, vector<int>(n+1));
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1[i-1] == word2[j-1]) dp[i][j] = dp[i-1][j-1];
            else dp[i][j] = 1 + min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
        }
    }
    return dp[m][n];
}
```

---

## 【LeetCode 221】最大正方形
**题目**：在一个由 '0' 和 '1' 组成的二维矩阵内，找到只包含 '1' 的最大正方形，返回其面积。

**核心思路**：`dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1`（当 matrix[i][j] == '1' 时）。

```cpp
int maximalSquare(vector<vector<char>>& matrix) {
    int m = matrix.size(), n = matrix[0].size(), maxSide = 0;
    vector<vector<int>> dp(m+1, vector<int>(n+1, 0));
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (matrix[i-1][j-1] == '1') {
                dp[i][j] = min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]}) + 1;
                maxSide = max(maxSide, dp[i][j]);
            }
        }
    }
    return maxSide * maxSide;
}
```

---

# 补充十一、贪心

## 【LeetCode 55】跳跃游戏
**题目**：给定非负整数数组，每个元素代表在该位置可以跳跃的最大长度，判断能否到达最后一个下标。

**核心思路**：维护能到达的最远位置 `maxReach`。

```cpp
bool canJump(vector<int>& nums) {
    int maxReach = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (i > maxReach) return false;
        maxReach = max(maxReach, i + nums[i]);
    }
    return true;
}
```

---

## 【LeetCode 56】合并区间
**题目**：合并所有重叠的区间。

**核心思路**：按左端点排序，逐个检查是否重叠。

```cpp
vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> res;
    for (auto& iv : intervals) {
        if (res.empty() || res.back()[1] < iv[0]) res.push_back(iv);
        else res.back()[1] = max(res.back()[1], iv[1]);
    }
    return res;
}
```

---

## 【LeetCode 581】最短无序连续子数组
**题目**：找出最短的一个连续子数组，如果对这个子数组升序排列，那么整个数组就升序排列。

**核心思路**：从左找右边界（最后一个比左侧最大值小的位置），从右找左边界（最后一个比右侧最小值大的位置）。

```cpp
int findUnsortedSubarray(vector<int>& nums) {
    int n = nums.size(), maxVal = INT_MIN, minVal = INT_MAX;
    int left = -1, right = -1;
    for (int i = 0; i < n; i++) {
        if (nums[i] < maxVal) right = i;
        else maxVal = nums[i];
    }
    for (int i = n - 1; i >= 0; i--) {
        if (nums[i] > minVal) left = i;
        else minVal = nums[i];
    }
    return right == -1 ? 0 : right - left + 1;
}
```

---

# 补充十二、单调栈

## 【LeetCode 42】接雨水
**题目**：给定 n 个非负整数表示宽度为 1 的柱子的高度图，计算能接多少雨水。

**核心思路**：双指针法。维护左右最大高度，从较矮一侧向中间移动计算积水。

```cpp
int trap(vector<int>& height) {
    int left = 0, right = height.size() - 1;
    int leftMax = 0, rightMax = 0, water = 0;
    while (left < right) {
        if (height[left] < height[right]) {
            leftMax = max(leftMax, height[left]);
            water += leftMax - height[left];
            left++;
        } else {
            rightMax = max(rightMax, height[right]);
            water += rightMax - height[right];
            right--;
        }
    }
    return water;
}
```

---

## 【LeetCode 84】柱状图中最大的矩形
**题目**：给定 n 个非负整数表示柱状图中各个柱子的高度，找出能勾勒出的最大矩形面积。

**核心思路**：单调递增栈。对每个柱子找左右第一个更矮的柱子。

```cpp
int largestRectangleArea(vector<int>& heights) {
    int n = heights.size(), maxArea = 0;
    stack<int> st;
    for (int i = 0; i <= n; i++) {
        int h = (i == n) ? 0 : heights[i];
        while (!st.empty() && h < heights[st.top()]) {
            int height = heights[st.top()]; st.pop();
            int width = st.empty() ? i : i - st.top() - 1;
            maxArea = max(maxArea, height * width);
        }
        st.push(i);
    }
    return maxArea;
}
```

---

## 【LeetCode 85】最大矩形
**题目**：给定一个仅包含 0 和 1 的二维矩阵，找出只包含 1 的最大矩形面积。

**核心思路**：逐行构建柱状图高度，复用 84 题解法。

```cpp
int maximalRectangle(vector<vector<char>>& matrix) {
    if (matrix.empty()) return 0;
    int m = matrix.size(), n = matrix[0].size(), maxArea = 0;
    vector<int> heights(n, 0);
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++)
            heights[j] = (matrix[i][j] == '1') ? heights[j] + 1 : 0;
        maxArea = max(maxArea, largestRectangleArea(heights));
    }
    return maxArea;
}
```

---

## 【LeetCode 739】每日温度
**题目**：给定每日温度数组，返回每天需要等几天才能等到更高温度。

**核心思路**：单调递减栈，栈中存下标。

```cpp
vector<int> dailyTemperatures(vector<int>& temperatures) {
    int n = temperatures.size();
    vector<int> res(n, 0);
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && temperatures[i] > temperatures[st.top()]) {
            int idx = st.top(); st.pop();
            res[idx] = i - idx;
        }
        st.push(i);
    }
    return res;
}
```

---

> **补充完成**：本文档新增 39 道 LeetCode Hot 100 题目，加上原有 61 道，共计覆盖 **100 道** LeetCode 热门面试题。
