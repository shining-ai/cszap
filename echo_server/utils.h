#ifndef UTILS_H
#define UTILS_H

int send_all(int socket_fd, char *buffer, size_t length);
int recv_all(int socket_fd, char *buffer, int length);
int valid_port(const char *port_str, int *port);
int create_socket();
ssize_t recv_with_error_handling(int socket_fd, char *buffer, int buffer_size);

#endif
